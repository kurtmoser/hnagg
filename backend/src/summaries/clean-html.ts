/**
 * Shrinks raw page HTML for the LLM without losing structure: drops scripts
 * (except JSON-LD and Next.js page data, which often hold the real content),
 * styles, inline SVG, <noscript> and comments, and collapses whitespace.
 * All other tags are kept.
 */
export function cleanHtmlForLlm(html: string): string {
  return html
    .replace(/<script\b([^>]*)>[\s\S]*?<\/script\s*>/gi, (tag, attrs: string) =>
      /application\/ld\+json|__NEXT_DATA__/i.test(attrs) ? tag : '',
    )
    .replace(/<style\b[\s\S]*?<\/style\s*>/gi, '')
    .replace(/<svg\b[\s\S]*?<\/svg\s*>/gi, '')
    .replace(/<noscript\b[\s\S]*?<\/noscript\s*>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\s*\n\s*/g, '\n')
    .trim();
}
