/**
 * PDF Generation Service
 *
 * Renders HTML documents to real PDF files entirely client-side (no server round trip):
 * the HTML is loaded into a hidden iframe, and each real page — every `.a4-page` section
 * that layoutEngine.ts wraps generated content in — is captured with html2canvas as its
 * own image and added as its own page in a jsPDF document.
 *
 * Previously this called a server API route that was a non-functional placeholder — it
 * returned the raw HTML bytes labeled as `application/pdf`, which produced a file that
 * downloaded fine but failed to open in any real PDF viewer.
 */
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { pdfDownloadFolder } from './pdfDownloadFolder';

const A4_WIDTH_MM = 210;
const A4_HEIGHT_MM = 297;
const RENDER_SCALE = 2; // ~192dpi equivalent — crisp text and letterhead art

async function renderPageCanvases(htmlContent: string): Promise<HTMLCanvasElement[]> {
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.left = '-10000px';
  iframe.style.top = '0';
  iframe.style.width = `${A4_WIDTH_MM}mm`;
  iframe.style.border = '0';
  document.body.appendChild(iframe);

  try {
    await new Promise<void>((resolve, reject) => {
      iframe.onload = () => resolve();
      iframe.onerror = () => reject(new Error('Failed to load document for PDF rendering.'));
      iframe.srcdoc = htmlContent;
    });

    const doc = iframe.contentDocument;
    if (!doc?.body) throw new Error('Unable to access document content for PDF rendering.');

    // Give web fonts and letterhead/signature images time to finish loading before capture.
    await new Promise((resolve) => setTimeout(resolve, 400));
    const fonts = (doc as any).fonts;
    if (fonts?.ready) {
      await fonts.ready.catch(() => undefined);
    }

    const captureOptions = { scale: RENDER_SCALE, useCORS: true, backgroundColor: '#ffffff' };

    // Every generated document is wrapped in one or more `.a4-page` sections
    // (see layoutEngine.ts). Capturing each one individually — rather than the
    // whole body as one tall image sliced by fixed pixel height — means page
    // breaks land exactly where the layout puts them. The previous height-based
    // slicing approach mis-fired: `.a4-page` has an 8px bottom margin (spacing
    // for on-screen stacking of multiple pages), which pushed the total captured
    // height just over one page's worth and produced a near-blank trailing page.
    const pageElements = Array.from(doc.querySelectorAll<HTMLElement>('.a4-page'));
    if (pageElements.length > 0) {
      const canvases: HTMLCanvasElement[] = [];
      for (const pageEl of pageElements) {
        canvases.push(await html2canvas(pageEl, captureOptions));
      }
      return canvases;
    }

    // Fallback for content with no `.a4-page` wrapper.
    return [
      await html2canvas(doc.body, {
        ...captureOptions,
        windowWidth: doc.body.scrollWidth,
        windowHeight: doc.body.scrollHeight,
      }),
    ];
  } finally {
    document.body.removeChild(iframe);
  }
}

function buildPDFFromPageCanvases(canvases: HTMLCanvasElement[]): jsPDF {
  const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
  canvases.forEach((canvas, index) => {
    if (index > 0) pdf.addPage();
    pdf.addImage(canvas.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, A4_WIDTH_MM, A4_HEIGHT_MM);
  });
  return pdf;
}

function ensurePdfExtension(filename: string): string {
  return filename.toLowerCase().endsWith('.pdf') ? filename : `${filename}.pdf`;
}

export const pdfService = {
  /** Renders HTML content to a real PDF Blob. */
  async generatePDFBlob(htmlContent: string): Promise<Blob> {
    const pageCanvases = await renderPageCanvases(htmlContent);
    return buildPDFFromPageCanvases(pageCanvases).output('blob');
  },

  /**
   * Generates a PDF and saves it — either directly into the user's configured PDF
   * download folder (Settings, Chrome/Edge only), or via a normal browser download.
   */
  async downloadPDF(
    htmlContent: string,
    filename: string
  ): Promise<{ savedToFolder: boolean; folderName?: string }> {
    const blob = await this.generatePDFBlob(htmlContent);
    const safeFilename = ensurePdfExtension(filename);

    const folderHandle = await pdfDownloadFolder.getActiveFolder();
    if (folderHandle) {
      try {
        await pdfDownloadFolder.saveBlobToFolder(folderHandle, safeFilename, blob);
        return { savedToFolder: true, folderName: folderHandle.name };
      } catch (error) {
        console.warn('Could not write PDF to configured folder, falling back to browser download:', error);
      }
    }

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = safeFilename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return { savedToFolder: false };
  },

  /**
   * Print HTML content directly (opens a new window and triggers the browser's print
   * dialog — this already produces valid output since it uses the browser's own PDF
   * renderer when "Save as PDF" is chosen).
   */
  printHTML(htmlContent: string): void {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      printWindow.print();
    }
  },
};
