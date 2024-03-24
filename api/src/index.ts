import axios from "axios";
import { PDFDocument } from "pdf-lib";
import { Document } from "langchain/document";
import { writeFile, unlink } from "fs/promises";
import { UnstructuredLoader } from "langchain/document_loaders/fs/unstructured";

async function deletePages(
  pdf: Buffer,
  pagesToDelete: number[]
): Promise<Buffer> {
  const pdfDoc = await PDFDocument.load(pdf);
  let numToOffsetBy = 1;
  for (const pageNum of pagesToDelete) {
    pdfDoc.removePage(pageNum - numToOffsetBy);
    numToOffsetBy++;
  }
  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}

async function loadPdfFromUrl(url: string): Promise<Buffer> {
  const response = await axios.get(url, {
    responseType: "arraybuffer",
  });

  return response.data;
}

async function convertPdfToDocuments(pdf: Buffer): Promise<Array<Document>> {
  if (!process.env.UNSTRUCTURED_API_KEY) {
    throw new Error("UNSTRUCTURED_API_KEY not set");
  }
  const randomName = Math.random().toString(36).substring(7);
  await writeFile(`pdfs/${randomName}.pdf`, pdf, "binary");
  const loader = new UnstructuredLoader(`pdfs/${randomName}.pdf`, {
    apiKey: process.env.UNSTRUCTURED_API_KEY,
    strategy: "hi_res",
  });
  const documents = await loader.load();
  await unlink(`pdfs/${randomName}.pdf`);
  return documents;
}

async function main({
  paperUrl,
  name,
  pagesToDelete,
}: {
  paperUrl: string;
  name: string;
  pagesToDelete: number[];
}) {
  if (!paperUrl.endsWith("pdf")) {
    throw new Error("not a pdf");
  }

  let pdfAsBuffer = await loadPdfFromUrl(paperUrl);
  if (pagesToDelete && pagesToDelete.length > 0) {
    pdfAsBuffer = await deletePages(pdfAsBuffer, pagesToDelete);
  }
  const documents = await convertPdfToDocuments(pdfAsBuffer);
  console.log(documents);
  console.log("length", documents.length);
}

main({ paperUrl: "https://arxiv.org/pdf/2305.15334.pdf", name: "test", pagesToDelete: [] });
