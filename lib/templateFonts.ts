/**
 * Shared font list for the Custom Template system (Settings > Custom Templates).
 * Kept in one place because the same Google Fonts import string and font-family
 * logic is needed in three spots: the live editor preview, the template list card
 * preview, and the actual render-time output (aiDraftService.ts) — letting them
 * drift out of sync would mean the preview lies about what actually renders.
 */
export const TEMPLATE_FONTS_GOOGLE_IMPORT_URL =
  'https://fonts.googleapis.com/css2?family=Noto+Sans+Devanagari:wght@400;500;700&family=Inter:wght@400;500;600;700&family=Poppins:wght@400;500;600;700&family=Montserrat:wght@400;500;600;700&family=Kalam:wght@400;700&family=Caveat:wght@400;500;600;700&display=swap';

const HANDWRITING_FONTS = new Set(['Kalam', 'Caveat']);

export function isHandwritingFont(fontFamily?: string): boolean {
  return Boolean(fontFamily && HANDWRITING_FONTS.has(fontFamily));
}

/** Handwriting fonts read more naturally with extra breathing room than typed fonts. */
export function getFontStyleAdjustments(fontFamily?: string): string {
  return isHandwritingFont(fontFamily) ? 'line-height: 1.9; letter-spacing: 0.015em;' : '';
}
