import { extractText, getDocumentProxy } from 'unpdf';

/**
 * @description Parses a PDF file and extracts the text content.
 * @param data
 */
export async function parsePdf(data: ArrayBuffer) {
  const pdf = await getDocumentProxy(new Uint8Array(data));

  return extractText(pdf, { mergePages: false });
}
