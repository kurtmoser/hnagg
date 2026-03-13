import { Command, CommandRunner } from 'nest-commander';
import axios from 'axios';

@Command({
  name: 'extract-og-image',
  description: 'Fetch a URL and extract the og:image meta tag',
  arguments: '<url>',
})
export class ExtractOgImageCommand extends CommandRunner {
  async run(params: string[]): Promise<void> {
    const url = params[0];
    if (!url) {
      console.error('Usage: extract-og-image <url>');
      process.exitCode = 1;
      return;
    }

    try {
      const { data } = await axios.get<string>(url, {
        timeout: 10_000,
        maxRedirects: 5,
        responseType: 'text',
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; HNAggregator/1.0)',
          Accept: 'text/html',
        },
      });

      const ogImage = this.extractOgImage(data);

      if (ogImage) {
        console.log(ogImage);
      } else {
        console.error('No og:image found');
        process.exitCode = 1;
      }
    } catch (err) {
      console.error('Failed to fetch URL:', err.message ?? err);
      process.exitCode = 1;
    }
  }

  private extractOgImage(html: string): string | null {
    // Match <meta property="og:image" content="..."> in any attribute order
    const regex =
      /<meta\s+[^>]*?property\s*=\s*["']og:image["'][^>]*?content\s*=\s*["']([^"']+)["'][^>]*?\/?>/i;
    const match = html.match(regex);
    if (match) return match[1];

    // Also try content before property (some sites reverse the order)
    const regexReversed =
      /<meta\s+[^>]*?content\s*=\s*["']([^"']+)["'][^>]*?property\s*=\s*["']og:image["'][^>]*?\/?>/i;
    const matchReversed = html.match(regexReversed);
    return matchReversed ? matchReversed[1] : null;
  }
}
