import { PDFParse } from "pdf-parse";
import mammoth from "mammoth";

const MAX_BYTES = 5 * 1024 * 1024;

const ALLOWED_EXTENSIONS = new Set([".pdf", ".docx", ".doc"]);

export class ResumeParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ResumeParseError";
  }
}

function extensionOf(filename: string): string {
  const idx = filename.lastIndexOf(".");
  return idx >= 0 ? filename.slice(idx).toLowerCase() : "";
}

export function assertAllowedResumeFile(filename: string, size: number): void {
  if (size <= 0) {
    throw new ResumeParseError("Empty file");
  }
  if (size > MAX_BYTES) {
    throw new ResumeParseError("File too large (max 5 MB)");
  }
  const ext = extensionOf(filename);
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    throw new ResumeParseError("Upload a PDF or Word file (.pdf, .docx)");
  }
  if (ext === ".doc") {
    throw new ResumeParseError(
      "Old .doc format is not supported. Save as .docx or PDF and try again.",
    );
  }
}

async function extractPdfText(buffer: Buffer): Promise<string> {
  const parser = new PDFParse({ data: buffer });
  try {
    const result = await parser.getText();
    return result.text.trim();
  } finally {
    await parser.destroy();
  }
}

async function extractDocxText(buffer: Buffer): Promise<string> {
  const result = await mammoth.extractRawText({ buffer });
  return result.value.trim();
}

export async function extractResumeText(filename: string, buffer: Buffer): Promise<string> {
  assertAllowedResumeFile(filename, buffer.byteLength);
  const ext = extensionOf(filename);
  const text = ext === ".pdf" ? await extractPdfText(buffer) : await extractDocxText(buffer);
  if (!text) {
    throw new ResumeParseError(
      "Could not read text from that file. Try another export or paste the text.",
    );
  }
  return text;
}

export function safeResumeFilename(filename: string): string {
  return filename.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 120) || "resume";
}
