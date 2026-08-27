/** Rich text support for the copy fields (La Idea, Producción). Every field
 *  these functions touch used to be a plain <textarea> storing a plain
 *  string — every consumer downstream (SocialCaption, the feed simulators,
 *  PublishHubView's "copy caption", the jsPDF export) still expects plain
 *  text. Rather than migrate storage formats, a field's stored value can be
 *  EITHER plain text (every value that predates this) OR sanitized HTML
 *  (every value saved by RichTextField from now on) — toEditableHtml/
 *  htmlToPlainText tell the two apart at read time so nothing needs a
 *  one-time data migration. */

/** Inline formatting only — no headings, images, tables, or anything that
 *  would change layout or pull in remote content. Matches what a caption on
 *  Instagram/LinkedIn/TikTok can actually preserve (a link's underline, not
 *  its own font), so the editor doesn't promise more than the destination
 *  can render. */
const ALLOWED_TAGS = new Set(['B', 'STRONG', 'I', 'EM', 'U', 'A', 'UL', 'OL', 'LI', 'BR', 'P']);
const ALLOWED_ATTRS: Record<string, string[]> = {
  A: ['href'],
};

/** True once at least one allowed tag pattern is present — cheap enough to
 *  run on every field read without memoizing, and only needs to distinguish
 *  "definitely plain text" from "maybe rich HTML" before the real sanitizer
 *  (which is idempotent) confirms it. */
const RICH_TAG_RE = /<(b|strong|i|em|u|a|ul|ol|li|br|p)(\s|>|\/)/i;
export function looksLikeRichText(value: string): boolean {
  return RICH_TAG_RE.test(value);
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Removes any element/attribute outside the allowlist while KEEPING its text
 *  content — e.g. a pasted <span style="color:red">hola</span> becomes
 *  "hola", not nothing. Scripts and style/link/meta tags are the one case
 *  where the content itself is unsafe/meaningless, so those are dropped
 *  entirely rather than unwrapped. Safe to call on already-sanitized HTML —
 *  running it twice produces the same result as running it once. */
export function sanitizeHtml(dirty: string): string {
  const container = document.createElement('div');
  container.innerHTML = dirty;

  const DROP_ENTIRELY = new Set(['SCRIPT', 'STYLE', 'LINK', 'META', 'IFRAME', 'OBJECT', 'EMBED', 'IMG', 'svg']);

  function clean(node: Node) {
    // Iterate over a static snapshot — childNodes is live, and replacing a
    // node with its children mid-walk would otherwise skip/duplicate nodes.
    for (const child of Array.from(node.childNodes)) {
      if (child.nodeType === Node.TEXT_NODE) continue;

      if (child.nodeType !== Node.ELEMENT_NODE) {
        node.removeChild(child);
        continue;
      }

      const el = child as HTMLElement;
      if (DROP_ENTIRELY.has(el.tagName)) {
        node.removeChild(el);
        continue;
      }

      clean(el);

      if (!ALLOWED_TAGS.has(el.tagName)) {
        // Unwrap: replace the element with its (already-cleaned) children.
        while (el.firstChild) node.insertBefore(el.firstChild, el);
        node.removeChild(el);
        continue;
      }

      const keepAttrs = new Set(ALLOWED_ATTRS[el.tagName] || []);
      for (const attr of Array.from(el.attributes)) {
        if (!keepAttrs.has(attr.name)) el.removeAttribute(attr.name);
      }

      if (el.tagName === 'A') {
        const href = el.getAttribute('href') || '';
        // Only http(s) links — blocks javascript:/data: URIs pasted as an
        // href, which would otherwise execute on click.
        if (!/^https?:\/\//i.test(href)) {
          while (el.firstChild) node.insertBefore(el.firstChild, el);
          node.removeChild(el);
          continue;
        }
        el.setAttribute('target', '_blank');
        el.setAttribute('rel', 'noopener noreferrer');
      }
    }
  }

  clean(container);
  return container.innerHTML;
}

/** Converts a stored field value into the HTML a RichTextField's
 *  contentEditable should start with. A legacy plain-text value is escaped
 *  and its line breaks turned into <br> — critical: without escaping, a
 *  value that happens to contain a literal "<" or "&" (a stray HTML entity a
 *  user typed) would otherwise be parsed as markup instead of shown as text. */
export function toEditableHtml(value: string): string {
  if (!value) return '';
  if (looksLikeRichText(value)) return sanitizeHtml(value);
  return escapeHtml(value).replace(/\n/g, '<br>');
}

/** Extracts plain text from a field value for every consumer that can't
 *  render HTML: SocialCaption's feed simulators, PublishHubView's "copiar
 *  caption" (must copy exactly what will be pasted into Instagram/LinkedIn —
 *  those platforms don't render bold/italic/links, so copying markup would
 *  paste literal tag characters), and the jsPDF export. A legacy plain-text
 *  value passes through unchanged. */
export function htmlToPlainText(value: string): string {
  if (!value) return '';
  if (!looksLikeRichText(value)) return value;

  const container = document.createElement('div');
  container.innerHTML = sanitizeHtml(value);

  const BLOCK_TAGS = new Set(['P', 'LI', 'BR']);
  let text = '';
  function walk(node: Node) {
    for (const child of Array.from(node.childNodes)) {
      if (child.nodeType === Node.TEXT_NODE) {
        text += child.textContent || '';
        continue;
      }
      if (child.nodeType !== Node.ELEMENT_NODE) continue;
      const el = child as HTMLElement;
      if (el.tagName === 'BR') { text += '\n'; continue; }
      walk(el);
      if (BLOCK_TAGS.has(el.tagName)) text += '\n';
    }
  }
  walk(container);
  return text.replace(/\n{3,}/g, '\n\n').trim();
}
