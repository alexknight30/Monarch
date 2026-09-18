/** Local-only text extraction. Uploaded content is never sent to a provider here. */
export async function extractSchoolText(bytes: Buffer, filename: string, mime: string): Promise<string> {
  let text = "";
  if (mime === "application/pdf" || /\.pdf$/i.test(filename)) {
    const { PDFParse } = await import("pdf-parse");
    const parser = new PDFParse({ data: new Uint8Array(bytes) });
    try {
      const info = await parser.getInfo();
      if (info.total > 500) throw new Error("Import a section of this PDF at a time (up to 500 pages).");
      text = (await parser.getText()).text;
    } finally { await parser.destroy(); }
  } else if (/\.docx$/i.test(filename) || mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
    const mammoth = await import("mammoth");
    text = (await mammoth.extractRawText({ buffer: bytes })).value;
  } else if (/\.(txt|md|csv|tsv|tex)$/i.test(filename) || mime.startsWith("text/")) {
    text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } else throw new Error("Choose a PDF, Word (.docx), or text file. Older .doc files need to be saved as .docx first.");
  text = text.replace(/\u0000/g, "").trim();
  if (!text) throw new Error("No selectable text was found. For a scanned PDF, use a text-recognized copy or paste the reading text.");
  if (text.length > 500_000) throw new Error("This document is too long. Import a smaller section (up to 500,000 characters).");
  return text;
}
