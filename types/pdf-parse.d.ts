declare module "pdf-parse" {
  interface PdfParseResult {
    text: string;
    numpages: number;
    info: any;
  }
  interface PdfParseOptions {
    pagerender?: (pageData: any) => Promise<string>;
  }
  function pdfParse(dataBuffer: Buffer, options?: PdfParseOptions): Promise<PdfParseResult>;
  export default pdfParse;
}
