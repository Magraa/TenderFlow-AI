const DEFAULT_FONT_SIZE = '12px';

function escapeHTML(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function stripDangerousTags(html: string): string {
  return html
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, '')
    .replace(/on\w+="[^"]*"/gi, '')
    .replace(/on\w+='[^']*'/gi, '');
}

function normalizeBlockSpacing(html: string): string {
  return html
    .replace(/\s{2,}/g, ' ')
    .replace(/<p>\s*<\/p>/g, '')
    .replace(/style="[^"]*margin[^"]*"/gi, '')
    .replace(/style='[^']*margin[^']*'/gi, '');
}

export function forceStructuredDocBody(html: string): string {
  const trimmed = html.trim();
  if (!trimmed) return '';
  if (/<div[^>]*class=["']doc-body["'][^>]*>[\s\S]*<\/div>/i.test(trimmed)) return trimmed;

  if (/<[a-z][\s\S]*>/i.test(trimmed)) {
    return `<div class="doc-body">${trimmed}</div>`;
  }

  const paragraphs = trimmed
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => `<p>${escapeHTML(line)}</p>`)
    .join('');
  return `<div class="doc-body">${paragraphs}</div>`;
}

export function sanitizeAIHTML(html: string): string {
  const stripped = stripDangerousTags(html);
  const wrapped = forceStructuredDocBody(stripped);
  const normalized = normalizeBlockSpacing(wrapped);
  return `
    <div class="doc-font-normalizer">
      ${normalized}
    </div>
    <style>
      .doc-font-normalizer, .doc-font-normalizer * {
        max-width: 100%;
        box-sizing: border-box;
        font-size: ${DEFAULT_FONT_SIZE};
      }
      .doc-font-normalizer p {
        margin: 0 0 8px 0;
      }
      .doc-font-normalizer table {
        width: 100%;
        table-layout: fixed;
        word-break: break-word;
      }
      .doc-font-normalizer img {
        max-width: 100%;
        height: auto;
      }
    </style>
  `;
}

export function isAIResponseInvalid(html: string | undefined | null): boolean {
  if (!html) return true;
  const plain = html.replace(/<[^>]*>/g, '').trim();
  return plain.length < 20;
}

export function detectOverflowWarning(html: string): string | undefined {
  const plainLength = html.replace(/<[^>]*>/g, '').length;
  if (plainLength > 7000) return 'Content appears long and may overflow into additional pages.';
  return undefined;
}

export const aiFormatter = {
  sanitizeAIHTML,
  forceStructuredDocBody,
  isAIResponseInvalid,
  detectOverflowWarning,
};
