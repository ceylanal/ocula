"use client";

import React, { useState } from "react";
import {
  Brain,
  Sparkles,
  CheckCircle2,
  XCircle,
  KeyRound,
  RefreshCw,
} from "lucide-react";
import { Book, ComprehensionQuestion } from "@/types";
import { useOkurLabStore } from "@/store/useOkurLabStore";

interface BookComprehensionQuizProps {
  book: Book;
  currentWpm: number;
}

export function BookComprehensionQuiz({
  book,
  currentWpm,
}: BookComprehensionQuizProps) {
  const {
    setBookQuestions,
    recordExercise,
    geminiApiKey,
    setGeminiApiKey,
  } = useOkurLabStore();

  const [isGenerating, setIsGenerating] = useState(false);
  const [generationSource, setGenerationSource] = useState<string | null>(null);
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [submittedScore, setSubmittedScore] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const questions: ComprehensionQuestion[] = book.questions || [];

  const handleGenerateQuestions = async () => {
    setIsGenerating(true);
    setErrorMsg(null);
    setAnswers({});
    setSubmittedScore(null);

    try {
      const res = await fetch("/api/generate-questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookId: book.id,
          title: book.title,
          paragraphs: book.content,
          apiKey: geminiApiKey,
        }),
      });

      const data = await res.json();
      if (!res.ok || !Array.isArray(data.questions)) {
        throw new Error(data.error || "Sorular üretilemedi.");
      }

      setBookQuestions(book.id, data.questions);
      setGenerationSource(
        data.source === "gemini-ai"
          ? "Gemini 2.0 Flash LLM"
          : "Semantik Türkçe Metin Analiz Motoru"
      );
    } catch (err) {
      console.error(err);
      setErrorMsg(
        "Anlama soruları üretilirken bir hata oluştu. Lütfen tekrar deneyin."
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSubmitQuiz = () => {
    if (questions.length === 0) return;
    let correct = 0;
    questions.forEach((q) => {
      if (answers[q.id] === q.correct_option) {
        correct++;
      }
    });
    const pct = Math.round((correct / questions.length) * 100);
    setSubmittedScore(pct);

    recordExercise({
      exercise_type: "speed_test",
      achieved_wpm: currentWpm,
      accuracy_score: pct,
      duration_seconds: 60,
    });
  };

  const allAnswered =
    questions.length > 0 &&
    questions.every((q) => typeof answers[q.id] === "number");

  return (
    <div className="p-6 rounded-3xl bg-surface border-2 border-indigo-500/30 space-y-5 shadow-xl">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-400">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Faz 4 • Yapay Zeka Destekli Okuduğunu Anlama Motoru</span>
          </div>
          <h3 className="text-lg font-bold">
            &quot;{book.title}&quot; — Anlama ve Kavrama Testi
          </h3>
          {generationSource && (
            <p className="text-xs text-emerald-400">
              Kaynak: <strong>{generationSource}</strong> ile bu kitabın
              paragraflarından üretildi.
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setShowKeyInput((v) => !v)}
            className="px-3 py-2 rounded-xl bg-surface-elevated border border-border text-xs font-medium text-muted hover:text-foreground flex items-center gap-1.5 transition-colors"
            title="İsteğe bağlı Gemini API anahtarı yapılandır"
          >
            <KeyRound className="w-3.5 h-3.5 text-amber-400" />
            <span>{geminiApiKey ? "Gemini Key Aktif" : "LLM API Ayarı"}</span>
          </button>

          <button
            disabled={isGenerating}
            onClick={handleGenerateQuestions}
            className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-2 shadow-lg shadow-indigo-600/20 transition-all"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${isGenerating ? "animate-spin" : ""}`}
            />
            <span>
              {isGenerating
                ? "Metin Analiz Ediliyor..."
                : questions.length > 0
                ? "Yeni 4 Soru Üret (AI)"
                : "Bu Kitaptan 4 Anlama Sorusu Üret"}
            </span>
          </button>
        </div>
      </div>

      {/* Optional Gemini API Key Drawer */}
      {showKeyInput && (
        <div className="p-4 rounded-2xl bg-surface-elevated border border-border space-y-2">
          <div className="text-xs font-semibold">
            Google Gemini API Anahtarı (İsteğe Bağlı)
          </div>
          <p className="text-[11px] text-muted">
            Anahtar girerseniz sorular doğrudan <code>gemini-2.0-flash</code>{" "}
            modeliyle üretilir; boş bırakırsanız yerleşik Türkçe Semantik Cümle
            Analiz Motoru devreye girer.
          </p>
          <input
            type="password"
            value={geminiApiKey}
            onChange={(e) => setGeminiApiKey(e.target.value)}
            placeholder="AIzaSy..."
            className="w-full rounded-xl bg-surface border border-border px-3 py-2 text-xs focus:outline-none focus:border-indigo-500"
          />
        </div>
      )}

      {errorMsg && (
        <p className="text-xs text-rose-400 font-medium">{errorMsg}</p>
      )}

      {/* Questions List */}
      {questions.length === 0 ? (
        <div className="p-8 rounded-2xl bg-surface-elevated/60 border border-border text-center space-y-3">
          <Brain className="w-8 h-8 text-indigo-400 mx-auto" />
          <div className="text-sm font-semibold">
            Yüklediğiniz veya Okuduğunuz Kitaptan Anında Soru Üretin
          </div>
          <p className="text-xs text-muted max-w-md mx-auto">
            Sağ üstteki{" "}
            <strong className="text-foreground">
              &quot;Bu Kitaptan 4 Anlama Sorusu Üret&quot;
            </strong>{" "}
            butonuna tıkladığınızda{" "}
            <code className="text-indigo-400">/api/generate-questions</code> uç
            noktası kitabın paragraflarını tarayarak çoktan seçmeli test
            oluşturur.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {questions.map((q, qIdx) => {
            const selected = answers[q.id];
            return (
              <div
                key={q.id}
                className="p-5 rounded-2xl bg-surface-elevated/50 border border-border space-y-3"
              >
                <div className="font-semibold text-sm">
                  {qIdx + 1}. {q.question_text}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {q.options.map((opt, oIdx) => {
                    const isPicked = selected === oIdx;
                    const isCorrect = q.correct_option === oIdx;

                    let btnStyle =
                      "bg-surface border-border text-foreground/85 hover:border-indigo-500/40";
                    if (submittedScore !== null) {
                      if (isCorrect) {
                        btnStyle =
                          "bg-emerald-500/15 border-emerald-500 text-emerald-400 font-semibold";
                      } else if (isPicked) {
                        btnStyle =
                          "bg-rose-500/15 border-rose-500 text-rose-400";
                      }
                    } else if (isPicked) {
                      btnStyle =
                        "bg-indigo-600/20 border-indigo-500 text-foreground font-semibold";
                    }

                    return (
                      <button
                        key={oIdx}
                        disabled={submittedScore !== null}
                        onClick={() =>
                          setAnswers((prev) => ({ ...prev, [q.id]: oIdx }))
                        }
                        className={`p-3 rounded-xl border text-left text-xs transition-all flex items-start gap-2.5 ${btnStyle}`}
                      >
                        <span className="font-bold text-indigo-400 shrink-0">
                          {["A)", "B)", "C)", "D)"][oIdx]}
                        </span>
                        <span>{opt}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* Submit or Score Banner */}
          {submittedScore === null ? (
            <div className="flex justify-end">
              <button
                disabled={!allAnswered}
                onClick={handleSubmitQuiz}
                className={`px-6 py-3 rounded-xl text-xs font-bold flex items-center gap-2 transition-all ${
                  allAnswered
                    ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/20"
                    : "bg-surface-elevated border border-border text-muted cursor-not-allowed"
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Cevapları Kontrol Et ve Anlama Oranını Kaydet</span>
              </button>
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                {submittedScore >= 50 ? (
                  <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                ) : (
                  <XCircle className="w-6 h-6 text-amber-400" />
                )}
                <div>
                  <div className="text-sm font-bold">
                    Kitap Anlama Oranınız:{" "}
                    <span className="text-emerald-400">%{submittedScore}</span>{" "}
                    | Okuma Hızınız:{" "}
                    <span className="text-indigo-400">{currentWpm} WPM</span>
                  </div>
                  <div className="text-xs text-muted">
                    Sonuç Dashboard istatistiklerinize ve egzersiz geçmişinize
                    kaydedildi.
                  </div>
                </div>
              </div>
              <button
                onClick={() => {
                  setAnswers({});
                  setSubmittedScore(null);
                }}
                className="px-4 py-2 rounded-xl bg-surface border border-border text-xs font-semibold hover:bg-surface-elevated"
              >
                Testi Sıfırla
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
