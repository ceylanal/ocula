import JSZip from "jszip";
import { countWordsInParagraphs } from "./textUtils";

export interface ParsedBookData {
  title: string;
  author: string;
  paragraphs: string[];
  wordCount: number;
  pageCount?: number;
  format: "PDF" | "EPUB" | "TXT" | "MD";
}

export type ParseProgressCallback = (statusText: string) => void;

/**
 * Parses an uploaded .pdf, .epub, .txt, or .md file into clean paragraphs and metadata
 * for the Smart Reader (Standard, RSVP, and Magic Pacer modes).
 */
export async function parseUploadedBookFile(
  file: File,
  onProgress?: ParseProgressCallback
): Promise<ParsedBookData> {
  const fileName = file.name;
  const ext = fileName.split(".").pop()?.toLowerCase() || "txt";
  const fallbackTitle = fileName.replace(/\.(pdf|epub|txt|md|markdown)$/i, "");

  if (ext === "pdf") {
    return parsePdfFile(file, fallbackTitle, onProgress);
  }

  if (ext === "epub") {
    onProgress?.("EPUB arşivi ve bölümleri ayrıştırılıyor...");
    return parseEpubFile(file, fallbackTitle);
  }

  onProgress?.("Metin dosyası paragraflara dönüştürülüyor...");
  return parseTextOrMarkdownFile(
    file,
    fallbackTitle,
    ext === "md" || ext === "markdown" ? "MD" : "TXT"
  );
}

/**
 * Extracts text and metadata from a PDF file using Mozilla PDF.js,
 * reconstructing lines, fixing hyphenation, removing page number headers/footers,
 * and grouping into readable paragraphs for RSVP and Magic Pacer.
 */
async function parsePdfFile(
  file: File,
  fallbackTitle: string,
  onProgress?: ParseProgressCallback
): Promise<ParsedBookData> {
  onProgress?.("PDF motoru başlatılıyor...");

  // Load prebuilt ESM PDF.js directly from public/ to avoid Next.js 14 webpack __webpack_modules__ collision
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pdfjsLib: any = await import(
    /* webpackIgnore: true */ ("/pdf.min.mjs" as string)
  );
  pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(arrayBuffer),
  });

  const pdf = await loadingTask.promise;
  const totalPages = pdf.numPages;

  let title = fallbackTitle;
  let author = "PDF Kitap";

  try {
    const meta = await pdf.getMetadata();
    const info = meta?.info as Record<string, unknown> | undefined;
    if (info) {
      if (typeof info.Title === "string" && info.Title.trim().length > 1) {
        title = info.Title.trim();
      }
      if (typeof info.Author === "string" && info.Author.trim().length > 1) {
        author = info.Author.trim();
      }
    }
  } catch {
    // Ignore metadata errors and use fallback filename
  }

  const allParagraphs: string[] = [];

  for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
    onProgress?.(`PDF sayfası okunuyor: ${pageNum} / ${totalPages}...`);

    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();

    interface PositionedItem {
      str: string;
      x: number;
      y: number;
      height: number;
      hasEOL: boolean;
    }

    const items: PositionedItem[] = [];
    for (const rawItem of textContent.items) {
      if ("str" in rawItem && typeof rawItem.str === "string") {
        const str = rawItem.str;
        if (!str.trim() && !rawItem.hasEOL) continue;
        const transform = rawItem.transform || [1, 0, 0, 1, 0, 0];
        items.push({
          str,
          x: transform[4] ?? 0,
          y: transform[5] ?? 0,
          height: rawItem.height || Math.abs(transform[3]) || 12,
          hasEOL: Boolean(rawItem.hasEOL),
        });
      }
    }

    if (items.length === 0) continue;

    // Group items into visual lines based on Y coordinate proximity
    const lines: { y: number; height: number; text: string }[] = [];
    let currentLineItems: PositionedItem[] = [];
    let currentLineY: number | null = null;
    let currentLineHeight = 12;

    const flushLine = () => {
      if (currentLineItems.length === 0 || currentLineY === null) return;
      const lineStr = currentLineItems
        .map((it) => it.str)
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();
      if (lineStr) {
        lines.push({
          y: currentLineY,
          height: currentLineHeight,
          text: lineStr,
        });
      }
      currentLineItems = [];
      currentLineY = null;
    };

    for (const item of items) {
      if (currentLineY === null) {
        currentLineY = item.y;
        currentLineHeight = item.height || 12;
        currentLineItems.push(item);
      } else {
        const yDiff = Math.abs(item.y - currentLineY);
        if (yDiff <= Math.max(4, currentLineHeight * 0.45)) {
          currentLineItems.push(item);
        } else {
          flushLine();
          currentLineY = item.y;
          currentLineHeight = item.height || 12;
          currentLineItems.push(item);
        }
      }
      if (item.hasEOL) {
        flushLine();
      }
    }
    flushLine();

    // Filter out standalone page numbers at the very top or bottom line
    const filteredLines = lines.filter((line, idx) => {
      if (
        (idx === 0 || idx === lines.length - 1) &&
        /^(\d+|sayfa\s*\d+|page\s*\d+|-\s*\d+\s*-)$/i.test(line.text.trim())
      ) {
        return false;
      }
      return true;
    });

    if (filteredLines.length === 0) continue;

    // Reconstruct paragraphs from visual vertical gaps & sentence boundaries
    let currentPara = "";
    for (let i = 0; i < filteredLines.length; i++) {
      const line = filteredLines[i];
      const prevLine = i > 0 ? filteredLines[i - 1] : null;

      let startsNewParagraph = false;
      if (prevLine) {
        const verticalGap = Math.abs(prevLine.y - line.y);
        const avgHeight = (prevLine.height + line.height) / 2 || 12;
        // Larger vertical spacing indicates a paragraph break
        if (verticalGap > avgHeight * 1.55) {
          startsNewParagraph = true;
        }
        // Or if current paragraph is already reasonably long and previous line ended with sentence punctuation
        const wordCountSoFar = currentPara.split(/\s+/).length;
        if (wordCountSoFar >= 75 && /[.!?…:"”»]$/.test(prevLine.text.trim())) {
          startsNewParagraph = true;
        }
      }

      if (startsNewParagraph && currentPara.trim()) {
        allParagraphs.push(currentPara.trim());
        currentPara = line.text;
      } else {
        if (!currentPara) {
          currentPara = line.text;
        } else if (currentPara.endsWith("-")) {
          // Join hyphenated word across line break
          currentPara = currentPara.slice(0, -1) + line.text;
        } else {
          currentPara += " " + line.text;
        }
      }
    }

    if (currentPara.trim()) {
      allParagraphs.push(currentPara.trim());
    }
  }

  const finalParagraphs = allParagraphs
    .map((p) => p.replace(/\s+/g, " ").trim())
    .filter((p) => p.length > 1);

  if (finalParagraphs.length === 0) {
    finalParagraphs.push(
      "Bu PDF dosyasından seçilebilir metin katmanı okunamadı (taranmış resim/OCR gerektiren bir PDF olabilir). Lütfen metin katmanı içeren bir PDF, EPUB veya TXT dosyası deneyin."
    );
  }

  return {
    title,
    author,
    paragraphs: finalParagraphs,
    wordCount: countWordsInParagraphs(finalParagraphs),
    pageCount: totalPages,
    format: "PDF",
  };
}

async function parseTextOrMarkdownFile(
  file: File,
  fallbackTitle: string,
  format: "TXT" | "MD"
): Promise<ParsedBookData> {
  const rawText = await file.text();
  let title = fallbackTitle;

  const lines = rawText.replace(/\r\n/g, "\n").split("\n");
  const firstHeading = lines.find((l) => /^#\s+/.test(l.trim()));
  if (firstHeading) {
    title = firstHeading.replace(/^#\s+/, "").trim();
  }

  const cleanedText = rawText
    .replace(/\r\n/g, "\n")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/`{1,3}(.*?)`{1,3}/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");

  const paragraphs = cleanedText
    .split(/\n\s*\n+/)
    .map((p) => p.replace(/\s+/g, " ").trim())
    .filter((p) => p.length > 0);

  const finalParagraphs =
    paragraphs.length > 0
      ? paragraphs
      : [cleanedText.replace(/\s+/g, " ").trim()].filter(Boolean);

  return {
    title,
    author: "Kişisel Kütüphane",
    paragraphs: finalParagraphs,
    wordCount: countWordsInParagraphs(finalParagraphs),
    format,
  };
}

async function parseEpubFile(
  file: File,
  fallbackTitle: string
): Promise<ParsedBookData> {
  const arrayBuffer = await file.arrayBuffer();
  const zip = await JSZip.loadAsync(arrayBuffer);

  let title = fallbackTitle;
  let author = "EPUB Yazar";
  const paragraphs: string[] = [];

  try {
    const containerXml = await zip
      .file("META-INF/container.xml")
      ?.async("string");
    let opfPath = "";

    if (containerXml) {
      const parser = new DOMParser();
      const containerDoc = parser.parseFromString(
        containerXml,
        "application/xml"
      );
      const rootfile = containerDoc.querySelector("rootfile");
      opfPath = rootfile?.getAttribute("full-path") || "";
    }

    if (!opfPath) {
      const opfFiles = Object.keys(zip.files).filter((k) =>
        k.endsWith(".opf")
      );
      if (opfFiles.length > 0) opfPath = opfFiles[0];
    }

    if (opfPath && zip.file(opfPath)) {
      const opfContent = await zip.file(opfPath)!.async("string");
      const parser = new DOMParser();
      const opfDoc = parser.parseFromString(opfContent, "application/xml");

      const dcTitle =
        opfDoc.querySelector("title")?.textContent ||
        opfDoc.getElementsByTagName("dc:title")[0]?.textContent;
      const dcCreator =
        opfDoc.querySelector("creator")?.textContent ||
        opfDoc.getElementsByTagName("dc:creator")[0]?.textContent;

      if (dcTitle?.trim()) title = dcTitle.trim();
      if (dcCreator?.trim()) author = dcCreator.trim();

      const opfDir = opfPath.includes("/")
        ? opfPath.slice(0, opfPath.lastIndexOf("/") + 1)
        : "";

      const manifestMap = new Map<string, string>();
      const items = Array.from(opfDoc.querySelectorAll("manifest > item"));
      items.forEach((item) => {
        const id = item.getAttribute("id");
        const href = item.getAttribute("href");
        if (id && href) {
          manifestMap.set(id, opfDir + decodeURIComponent(href));
        }
      });

      const spineRefs = Array.from(opfDoc.querySelectorAll("spine > itemref"));
      for (const ref of spineRefs) {
        const idref = ref.getAttribute("idref");
        if (!idref) continue;
        const chapterPath = manifestMap.get(idref);
        if (!chapterPath) continue;

        const zipEntry =
          zip.file(chapterPath) || zip.file(decodeURI(chapterPath));
        if (!zipEntry) continue;

        const htmlString = await zipEntry.async("string");
        const htmlDoc = parser.parseFromString(htmlString, "text/html");
        const blocks = Array.from(
          htmlDoc.querySelectorAll("p, h1, h2, h3, blockquote")
        );

        if (blocks.length > 0) {
          blocks.forEach((b) => {
            const txt = (b.textContent || "").replace(/\s+/g, " ").trim();
            if (txt.length > 15) {
              paragraphs.push(txt);
            }
          });
        } else {
          const bodyText = (htmlDoc.body?.textContent || "")
            .replace(/\s+/g, " ")
            .trim();
          if (bodyText.length > 20) {
            paragraphs.push(bodyText);
          }
        }
      }
    }

    if (paragraphs.length === 0) {
      const htmlFiles = Object.keys(zip.files)
        .filter((k) => /\.(xhtml|html|htm)$/i.test(k))
        .sort();
      const parser = new DOMParser();

      for (const htmlFile of htmlFiles) {
        const content = await zip.file(htmlFile)?.async("string");
        if (!content) continue;
        const doc = parser.parseFromString(content, "text/html");
        const pTags = Array.from(doc.querySelectorAll("p"));
        pTags.forEach((p) => {
          const txt = (p.textContent || "").replace(/\s+/g, " ").trim();
          if (txt.length > 15) paragraphs.push(txt);
        });
      }
    }
  } catch (err) {
    console.error("EPUB ayrıştırma hatası:", err);
  }

  if (paragraphs.length === 0) {
    paragraphs.push(
      "Bu EPUB dosyasından metin içeriği ayrıştırılamadı veya dosya korumalı (DRM) olabilir. Lütfen DRM içermeyen bir PDF, EPUB, TXT veya Markdown (.md) dosyası deneyin."
    );
  }

  return {
    title,
    author,
    paragraphs,
    wordCount: countWordsInParagraphs(paragraphs),
    format: "EPUB",
  };
}
