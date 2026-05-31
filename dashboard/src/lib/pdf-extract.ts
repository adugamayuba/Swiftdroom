/**
 * Multi-strategy PDF text extraction.
 *
 * Strategy 1: pdf-parse  — fast, works for most standard text PDFs
 * Strategy 2: pdfjs-dist — handles more complex PDFs (Canva, Figma, modern Word/Google Docs exports)
 * Strategy 3: OpenAI Vision — last resort for scanned / image-only PDFs (if OPENAI_API_KEY is set)
 */

const MAX_CHARS = 60000;

// ── Strategy 1: pdf-parse ───────────────────────────────────────────────────
async function tryPdfParse(buffer: Buffer): Promise<string> {
  try {
    const pdfParse = (await import("pdf-parse")).default;
    const data = await pdfParse(buffer);
    return (data.text || "").trim();
  } catch {
    return "";
  }
}

// ── Strategy 2: pdfjs-dist ──────────────────────────────────────────────────
async function tryPdfJs(buffer: Buffer): Promise<string> {
  try {
    // Use the legacy build which works in Node.js without a browser worker
    const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs" as string);

    // Disable the web worker — not needed for text extraction in Node.js
    // @ts-ignore
    pdfjs.GlobalWorkerOptions.workerSrc = "";

    const data = new Uint8Array(buffer);
    const doc = await (pdfjs as any).getDocument({
      data,
      useWorkerFetch: false,
      isEvalSupported: false,
      useSystemFonts: true,
      disableFontFace: true,
    }).promise;

    const pages: string[] = [];
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      const content = await page.getTextContent();
      const pageText = content.items
        .map((item: { str?: string }) => item.str ?? "")
        .join(" ");
      pages.push(pageText);
    }

    return pages.join("\n").trim();
  } catch {
    return "";
  }
}

// ── Strategy 3: OpenAI Vision ───────────────────────────────────────────────
// For scanned / image-only PDFs we can't render pages to images without native
// deps, but we CAN upload the raw PDF bytes and ask GPT-4o to read it using
// the Responses API (supports PDF file_data natively in base64).
async function tryOpenAiVision(buffer: Buffer): Promise<string> {
  if (!process.env.OPENAI_API_KEY) return "";

  try {
    const { default: OpenAI } = await import("openai");
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const base64 = buffer.toString("base64");

    // Use the Responses API which supports file_data with PDFs
    const response = await (client as any).responses.create({
      model: "gpt-4o",
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_file",
              filename: "resume.pdf",
              file_data: `data:application/pdf;base64,${base64}`,
            },
            {
              type: "input_text",
              text:
                "Extract ALL text from this resume PDF exactly as it appears. " +
                "Include name, contact info, work experience, education, skills, and any other sections. " +
                "Return only the raw text — no commentary, no markdown, no formatting.",
            },
          ],
        },
      ],
    });

    return (response.output_text || "").trim();
  } catch {
    return "";
  }
}

// ── Public API ───────────────────────────────────────────────────────────────
export async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  // Strategy 1
  const text1 = await tryPdfParse(buffer);
  if (text1.length > 50) return text1.slice(0, MAX_CHARS);

  // Strategy 2
  const text2 = await tryPdfJs(buffer);
  if (text2.length > 50) return text2.slice(0, MAX_CHARS);

  // Strategy 3 (only if OpenAI is configured — costs a small amount per PDF)
  const text3 = await tryOpenAiVision(buffer);
  if (text3.length > 10) return text3.slice(0, MAX_CHARS);

  return "";
}

export async function extractTextFromBuffer(
  buffer: Buffer,
  fileName: string
): Promise<string> {
  const ext = fileName.split(".").pop()?.toLowerCase();

  if (ext === "txt" || ext === "md") {
    return buffer.toString("utf-8").slice(0, MAX_CHARS);
  }

  if (ext === "pdf") {
    return extractTextFromPdf(buffer);
  }

  // Fallback: try as UTF-8
  return buffer.toString("utf-8").slice(0, MAX_CHARS);
}
