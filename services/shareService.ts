'use client';

/**
 * Shares a PDF via the OS-native share sheet (Web Share API) when the browser and
 * device support sharing files — this is how "Share via WhatsApp" actually attaches
 * the file on Android/iOS/modern desktop Chrome/Edge, since WhatsApp shows up as one
 * of the share targets the OS offers.
 *
 * There is no way for a web page to push a file attachment directly into a `wa.me`
 * link — WhatsApp's link/deep-link scheme only accepts pre-filled text, never a file.
 * So on browsers without file-sharing support, this falls back to downloading the PDF
 * and opening WhatsApp with a text prompt so the user can attach it themselves.
 */
export type SharePDFResult = 'shared' | 'cancelled' | 'downloaded-with-prompt';

export async function sharePDFViaWhatsApp(blob: Blob, filename: string, title: string): Promise<SharePDFResult> {
  const file = new File([blob], filename, { type: 'application/pdf' });
  const nav = typeof navigator !== 'undefined' ? (navigator as any) : undefined;

  if (nav?.canShare?.({ files: [file] })) {
    try {
      await nav.share({ files: [file], title, text: title });
      return 'shared';
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') return 'cancelled';
      // Fall through to the download + WhatsApp text fallback below.
    }
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  const message = encodeURIComponent(`${title} — downloaded as "${filename}". Attach it from your Downloads folder to send.`);
  window.open(`https://wa.me/?text=${message}`, '_blank');
  return 'downloaded-with-prompt';
}
