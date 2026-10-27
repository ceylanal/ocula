import { NextRequest, NextResponse } from "next/server";
import { ComprehensionQuestion } from "@/types";
import { verifyProAccess } from "@/lib/serverPlan";

interface GenerateQuestionsBody {
  bookId: string;
  title: string;
  paragraphs: string[];
  apiKey?: string;
}

/**
 * Phase 4 API Endpoint: /api/generate-questions
 * Generates 4 multiple-choice reading comprehension questions from any uploaded
 * PDF, EPUB, TXT, or Markdown text using Gemini LLM (if API key available)
 * or the built-in Semantic Turkish Text Analyzer.
 */
export async function POST(req: NextRequest) {
  // Anlama sorusu üretimi Pro özelliğidir (beta). Yetki istemciye değil, sunucuda doğrulanır.
  const access = await verifyProAccess(req);
  if (!access.ok) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  try {
    const body = (await req.json()) as GenerateQuestionsBody;
    const { bookId = "custom-book", title = "Metin", paragraphs = [], apiKey } = body;

    if (!Array.isArray(paragraphs) || paragraphs.length === 0) {
      return NextResponse.json(
        { error: "Soru üretmek için geçerli metin paragrafları gereklidir." },
        { status: 400 }
      );
    }

    const combinedText = paragraphs.slice(0, 25).join("\n\n").slice(0, 12000);
    const activeGeminiKey = apiKey?.trim() || process.env.GEMINI_API_KEY;

    // 1. Try Gemini LLM API if key is provided
    if (activeGeminiKey) {
      try {
        const prompt = `Aşağıdaki "${title}" başlıklı metni dikkatlice analiz et ve okuyucunun metni ne kadar anladığını ölçen 4 adet Türkçe çoktan seçmeli soru üret.
Her sorunun 4 şıkkı (options) olmalı ve correct_option (0, 1, 2 veya 3) doğru şıkkın indeksini belirtmelidir.
Yalnızca geçerli bir JSON dizisi döndür, başka hiçbir açıklama yazma. Şema:
[
  {
    "question_text": "Soru metni?",
    "options": ["A şıkkı", "B şıkkı", "C şıkkı", "D şıkkı"],
    "correct_option": 0
  }
]

METİN:
${combinedText}`;

        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${activeGeminiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: {
                temperature: 0.4,
                responseMimeType: "application/json",
              },
            }),
          }
        );

        if (response.ok) {
          const data = await response.json();
          const rawText =
            data?.candidates?.[0]?.content?.parts?.[0]?.text || "[]";
          const parsed = JSON.parse(rawText);

          if (Array.isArray(parsed) && parsed.length > 0) {
            const formatted: ComprehensionQuestion[] = parsed
              .slice(0, 4)
              .map((item, idx) => ({
                id: `ai-q-${Date.now()}-${idx}`,
                book_id: bookId,
                question_text: String(item.question_text || ""),
                options: Array.isArray(item.options)
                  ? item.options.slice(0, 4).map(String)
                  : ["Seçenek A", "Seçenek B", "Seçenek C", "Seçenek D"],
                correct_option:
                  typeof item.correct_option === "number"
                    ? item.correct_option
                    : 0,
              }));

            return NextResponse.json({
              source: "gemini-ai",
              questions: formatted,
            });
          }
        }
      } catch (llmError) {
        console.warn(
          "Gemini API çağrısı başarısız oldu, yerleşik semantik soru üreticiye geçiliyor:",
          llmError
        );
      }
    }

    // 2. Built-in Semantic Turkish Text Analyzer (Zero-config fallback)
    const semanticQuestions = generateSemanticQuestionsFromText(
      bookId,
      title,
      paragraphs
    );

    return NextResponse.json({
      source: "semantic-engine",
      questions: semanticQuestions,
    });
  } catch (err) {
    console.error("Soru üretim hatası:", err);
    return NextResponse.json(
      { error: "Sorular üretilirken beklenmeyen bir hata oluştu." },
      { status: 500 }
    );
  }
}

function generateSemanticQuestionsFromText(
  bookId: string,
  title: string,
  paragraphs: string[]
): ComprehensionQuestion[] {
  const fullText = paragraphs.join(" ");
  const rawSentences = fullText
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.replace(/\s+/g, " ").trim())
    .filter((s) => s.length >= 45 && s.length <= 240);

  const sentences =
    rawSentences.length >= 4
      ? rawSentences
      : paragraphs
          .map((p) => p.slice(0, 180).trim())
          .filter((p) => p.length > 20);

  const firstSentence =
    sentences[0] ||
    `"${title}" metni temel kavramları ve bütünsel düşünce yapısını ele almaktadır.`;
  const middleSentence =
    sentences[Math.floor(sentences.length / 2)] ||
    sentences[1] ||
    firstSentence;
  const lastSentence =
    sentences[sentences.length - 1] ||
    sentences[2] ||
    firstSentence;

  // Find a causal or contrast sentence if available
  const causalSentence =
    sentences.find((s) =>
      /\b(çünkü|nedeniyle|sayesinde|dolayısıyla|ancak|oysa|böylece|için)\b/i.test(
        s
      )
    ) ||
    sentences[Math.min(2, sentences.length - 1)] ||
    middleSentence;

  // Extract prominent long words (likely key domain concepts)
  const words = fullText
    .replace(/[.,!?;:()"'«»“”]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 6);

  const freqMap = new Map<string, number>();
  const stopWords = new Set([
    "olarak",
    "birlikte",
    "üzerinde",
    "arasında",
    "içinde",
    "olduğu",
    "olduğunu",
    "tarafından",
    "비록",
    "ancak",
    "sadece",
    "yalnızca",
    "bunların",
    "şekilde",
    "önemli",
    "대해",
  ]);

  words.forEach((w) => {
    const lower = w.toLocaleLowerCase("tr-TR");
    if (!stopWords.has(lower)) {
      freqMap.set(lower, (freqMap.get(lower) || 0) + 1);
    }
  });

  const topKeywords = Array.from(freqMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([k]) => k);

  const keywordCluster =
    topKeywords.length >= 3
      ? `${topKeywords.slice(0, 3).join(", ")}`
      : "odaklanma, kavramsal bütünlük ve analitik düşünce";

  const trimClause = (s: string) =>
    s.length > 135 ? s.slice(0, 132).trim() + "..." : s;

  return [
    {
      id: `sem-q-${Date.now()}-1`,
      book_id: bookId,
      question_text: `"${title}" metninin giriş ve temel çerçevesine göre aşağıdakilerden hangisi metinde doğrudan vurgulanan düşüncelerden biridir?`,
      options: [
        trimClause(firstSentence),
        "Metindeki tüm kavramların yalnızca ezberlenerek hiçbir analiz yapılmadan geçilmesi gerektiği",
        "Konunun tarihsel gelişiminin günümüzdeki uygulamalarla hiçbir bağının kalmadığı",
        "Bilgi işleme sürecinde hız ve odaklanmanın birbirini tamamen dışlayan iki zıt kavram olduğu",
      ],
      correct_option: 0,
    },
    {
      id: `sem-q-${Date.now()}-2`,
      book_id: bookId,
      question_text:
        "Metnin gelişme bölümünde aktarılan neden-sonuç veya karşılaştırma ilişkisine göre hangi ifade doğrudur?",
      options: [
        "Yazar, ele alınan konunun hiçbir pratik etkisinin olmadığını savunmaktadır",
        trimClause(causalSentence),
        "Metinde yalnızca istatistiksel tablolara yer verilip kavramsal açıklama yapılmamıştır",
        "Okuyucunun metni anlaması için dış kaynakları tamamen reddetmesi önerilmektedir",
      ],
      correct_option: 1,
    },
    {
      id: `sem-q-${Date.now()}-3`,
      book_id: bookId,
      question_text:
        "Okuduğunuz metin boyunca en sık işlenen ve metnin kavramsal omurgasını oluşturan anahtar kavram grubu aşağıdakilerden hangisidir?",
      options: [
        "Denizcilik astronomisi, gelgit hesaplamaları ve pusula kalibrasyonu",
        "Ortaçağ mimarisi, taş işçiliği ve gotik kemer statiği",
        `Metnin odaklandığı temel kavramlar: ${keywordCluster}`,
        "Tarımsal sulama kanalları ve mevsimsel yağış rejimleri",
      ],
      correct_option: 2,
    },
    {
      id: `sem-q-${Date.now()}-4`,
      book_id: bookId,
      question_text:
        "Metnin ilerleyişi ve sonuç bölümünde ulaşılan sentez dikkate alındığında hangi çıkarıma ulaşılabilir?",
      options: [
        "Bölüm sonunda başlangıçtaki tüm tezler geçersiz sayılmıştır",
        "Konunun gelecekte tamamen önemini yitireceği öngörülmektedir",
        "Hiçbir sonuca varılmadan metin yarım bırakılmıştır",
        trimClause(lastSentence),
      ],
      correct_option: 3,
    },
  ];
}
