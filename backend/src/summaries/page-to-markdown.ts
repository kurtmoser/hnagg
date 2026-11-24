import { NodeHtmlMarkdown } from 'node-html-markdown';

/** Elements removed together with their content before conversion. */
const NOISE_ELEMENTS = [
  'script',
  'style',
  'svg',
  'noscript',
  'template',
  'nav',
  'header',
  'footer',
  'aside',
  'form',
  'button',
  'iframe',
  'select',
];
const MAX_JSON_LD_CHARS = 5_000;
const MAX_EMBEDDED_JSON_CHARS = 30_000;
/** Below this much body text the page is probably rendered by JavaScript. */
const MIN_BODY_CHARS = 500;

const markdown = new NodeHtmlMarkdown({
  ignore: ['img', 'picture', 'video', 'audio', 'source'],
  maxConsecutiveNewlines: 2,
});

export type PageMarkdown = {
  markdown: string;
  /** The body has almost no text, e.g. a JavaScript app's loading placeholder. */
  thinBody: boolean;
};

/**
 * Converts a stored page (raw HTML) into compact Markdown for the LLM: a short
 * header from <head> (title, description, JSON-LD), then the body as Markdown
 * without navigation, forms, images or link URLs. Pages whose body is nearly
 * empty (JavaScript apps) get their embedded JSON data appended instead.
 */
export function pageToMarkdown(html: string): PageMarkdown {
  const head = html.match(/<head\b[\s\S]*?<\/head\s*>/i)?.[0] ?? '';
  const bodyHtml = html.match(/<body\b[\s\S]*<\/body\s*>/i)?.[0] ?? html;

  const parts: string[] = [];

  const title = textOf(head.match(/<title\b[^>]*>([\s\S]*?)<\/title\s*>/i)?.[1]);
  if (title) parts.push(`# ${title}`);

  const description =
    metaContent(head, 'property', 'og:description') ??
    metaContent(head, 'name', 'description');
  if (description) parts.push(`Description: ${description}`);

  const jsonLd = scriptContents(html, /application\/ld\+json/i).join('\n');
  if (jsonLd) parts.push(`JSON-LD: ${jsonLd.slice(0, MAX_JSON_LD_CHARS)}`);

  const body = bodyToMarkdown(bodyHtml);
  parts.push(body);

  const thinBody = body.length < MIN_BODY_CHARS;
  if (thinBody) {
    const embedded = scriptContents(
      html,
      /__NEXT_DATA__|application\/json/i,
    ).join('\n');
    if (embedded) {
      parts.push(
        `Embedded page data: ${embedded.slice(0, MAX_EMBEDDED_JSON_CHARS)}`,
      );
    }
  }

  return { markdown: parts.filter(Boolean).join('\n\n').trim(), thinBody };
}

function bodyToMarkdown(bodyHtml: string): string {
  let cleaned = bodyHtml.replace(/<!--[\s\S]*?-->/g, '');
  for (const tag of NOISE_ELEMENTS) {
    cleaned = cleaned.replace(
      new RegExp(`<${tag}\\b[\\s\\S]*?<\\/${tag}\\s*>`, 'gi'),
      '',
    );
  }

  return (
    markdown
      .translate(cleaned)
      // Leftover image syntax, then links: keep the link text, drop the URL.
      .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
      .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
      // Table padding: column-aligning spaces and dashes cost tokens.
      .replace(/ {2,}/g, ' ')
      .replace(/-{4,}/g, '---')
      .replace(/[ \t]+\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim()
  );
}

function scriptContents(html: string, attrPattern: RegExp): string[] {
  const results: string[] = [];
  const scriptRegex = /<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi;
  let match: RegExpExecArray | null;
  while ((match = scriptRegex.exec(html)) !== null) {
    if (attrPattern.test(match[1]) && match[2].trim()) {
      results.push(match[2].trim());
    }
  }
  return results;
}

function metaContent(
  head: string,
  attr: 'property' | 'name',
  value: string,
): string | null {
  const tagRegex = /<meta\b(?:[^>"']|"[^"]*"|'[^']*')*>/gi;
  let match: RegExpExecArray | null;
  while ((match = tagRegex.exec(head)) !== null) {
    const tag = match[0];
    const key = tag.match(new RegExp(`[\\s"']${attr}\\s*=\\s*(["'])([\\s\\S]*?)\\1`, 'i'))?.[2];
    if (key?.toLowerCase() !== value) continue;
    const content = tag.match(/[\s"']content\s*=\s*(["'])([\s\S]*?)\1/i)?.[2];
    const text = textOf(content);
    if (text) return text;
  }
  return null;
}

/** Plain text of a small HTML fragment (entities decoded, whitespace collapsed). */
function textOf(fragment: string | undefined): string {
  if (!fragment) return '';
  return markdown.translate(fragment).replace(/\s+/g, ' ').trim();
}
