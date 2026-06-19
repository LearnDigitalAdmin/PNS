import { marked } from 'marked';
import DOMPurify from 'dompurify';

marked.setOptions({
  breaks: true, // single line breaks become <br>, matches how editors expect plain typing to behave
  gfm: true,
});

/**
 * Converts an editor-authored Markdown string into sanitized HTML safe to
 * render via dangerouslySetInnerHTML. Used both by the admin live-preview
 * and the public Story modal so the two always render identically.
 */
export function renderMarkdown(md: string | undefined | null): string {
  if (!md) return '';
  const rawHtml = marked.parse(md, { async: false }) as string;
  return DOMPurify.sanitize(rawHtml, {
    ALLOWED_TAGS: [
      'p', 'br', 'strong', 'em', 'u', 's', 'a',
      'ul', 'ol', 'li', 'h2', 'h3', 'h4',
      'blockquote', 'code', 'pre', 'hr',
    ],
    ALLOWED_ATTR: ['href', 'target', 'rel'],
  });
}