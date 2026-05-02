import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import axios from 'axios';
import { execFile } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import sharp from 'sharp';
import decodeIco from 'decode-ico';
import { HnItem } from '../database/entities/hn-item.entity';
import { HnItemMetadata } from '../database/entities/hn-item-metadata.entity';
import { etDateToUtcRange } from '../common/timezone';

const execFileAsync = promisify(execFile);
const IMAGES_DIR = '/app/images';
const FAVICONS_DIR = '/app/favicons';
const CURL_IMPERSONATE_BIN = '/usr/local/bin/curl_chrome136';
const MAX_FETCH_ATTEMPTS = 3;
const RETRY_DELAY_MS = 60 * 60 * 1000;
const HN_ITEM_BASE_URL = 'https://news.ycombinator.com/item?id=';

type ImageDownloadOptions = {
  directory: string;
  filename: string;
  width: number;
  height: number;
  fit: keyof sharp.FitEnum;
};

type IcoDecodeImage = {
  width: number;
  height: number;
  data: Uint8Array | Uint8ClampedArray;
  type: 'bmp' | 'png';
};

@Injectable()
export class OgMetadataService {
  private readonly logger = new Logger(OgMetadataService.name);

  constructor(
    @InjectRepository(HnItem)
    private readonly hnItemRepo: Repository<HnItem>,
    @InjectRepository(HnItemMetadata)
    private readonly metadataRepo: Repository<HnItemMetadata>,
  ) { }

  async fetchOgMetadataForDate(
    dateStr: string,
    force = false,
  ): Promise<void> {
    const { from, to } = etDateToUtcRange(dateStr);

    const allItems = await this.hnItemRepo
      .createQueryBuilder('item')
      .where('item.type = :type', { type: 'story' })
      .andWhere('item.deleted = false')
      .andWhere('item.dead = false')
      .andWhere('item.time >= :from', { from })
      .andWhere('item.time < :to', { to })
      .orderBy('item.score', 'DESC', 'NULLS LAST')
      .addOrderBy('item.id', 'ASC')
      .limit(150)
      .getMany();

    let items: HnItem[];
    if (force) {
      items = allItems;
    } else {
      const itemIds = allItems.map((i) => i.id);
      const existingMetadata = itemIds.length > 0
        ? await this.metadataRepo
            .createQueryBuilder('meta')
            .select(['meta.id', 'meta.fetch_failed', 'meta.fetch_attempt_count', 'meta.last_fetch_attempted_at'])
            .where('meta.id IN (:...ids)', { ids: itemIds })
            .getMany()
        : [];
      const metadataMap = new Map(existingMetadata.map((m) => [m.id, m]));
      const oneHourAgo = new Date(Date.now() - RETRY_DELAY_MS);
      items = allItems.filter((item) => {
        const meta = metadataMap.get(item.id);
        if (!meta) return true;
        if (!meta.fetch_failed) return false;
        if (meta.fetch_attempt_count >= MAX_FETCH_ATTEMPTS) return false;
        if (meta.last_fetch_attempted_at && meta.last_fetch_attempted_at > oneHourAgo) return false;
        return true;
      });
    }

    this.logger.log(
      `Found ${allItems.length} top stories for ${dateStr} (processing ${items.length}${force ? ', force mode' : `, skipping ${allItems.length - items.length} with existing metadata`})`,
    );

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      this.logger.log(
        `Processing ${i + 1}/${items.length}: item ${item.id} — ${item.url}`,
      );

      try {
        if (force) {
          await this.deleteLocalImage(item.id);
        }
        await this.fetchAndStoreOgMetadata(
          item.id,
          this.getMetadataFetchUrl(item),
        );
      } catch (err) {
        this.logger.error(`Failed for item ${item.id}: ${err.message ?? err}`);
        await this.recordFetchFailure(item.id);
      }
    }

    this.logger.log(`Done fetching OG metadata for ${dateStr}.`);
  }

  async deleteLocalImage(itemId: number): Promise<void> {
    const metadata = await this.metadataRepo.findOneBy({ id: itemId });
    if (metadata?.local_image_path) {
      const filepath = path.join(IMAGES_DIR, metadata.local_image_path);
      if (fs.existsSync(filepath)) {
        fs.unlinkSync(filepath);
        console.log(`Deleted old image: ${filepath}`);
      }
    }
    if (metadata?.local_favicon_path) {
      const filepath = path.join(FAVICONS_DIR, metadata.local_favicon_path);
      if (fs.existsSync(filepath)) {
        fs.unlinkSync(filepath);
        console.log(`Deleted old favicon: ${filepath}`);
      }
    }
  }

  getMetadataFetchUrl(item: Pick<HnItem, 'id' | 'url'>): string {
    return item.url ?? `${HN_ITEM_BASE_URL}${item.id}`;
  }

  async fetchAndStoreOgMetadata(
    itemId: number,
    url: string,
  ): Promise<void> {
    let html: string;
    try {
      const { data } = await axios.get<string>(url, {
        timeout: 15_000,
        maxRedirects: 5,
        responseType: 'text',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept-Encoding': 'gzip, deflate, br',
          'Referer': 'https://hnagg.com/',
          'Connection': 'keep-alive',
          'Sec-Fetch-Site': 'cross-site',
          'Sec-Fetch-Mode': 'navigate',
          'Sec-Fetch-Dest': 'document',
        },
      });
      html = data;
    } catch (err) {
      if (err.response?.status === 403) {
        this.logger.warn(`Axios got 403 for ${url}, retrying with curl-impersonate`);
        const { stdout } = await execFileAsync(CURL_IMPERSONATE_BIN, [
          '--silent', '--location', '--max-time', '15', '--compressed', url,
        ], { maxBuffer: 10 * 1024 * 1024 });
        html = stdout;
      } else {
        throw err;
      }
    }

    const rawOgImage = this.extractImageUrl(html);
    const ogImage = rawOgImage
      ? this.resolveUrl(rawOgImage, url)
      : null;
    const faviconUrl = this.extractFaviconUrl(html, url);
    const ogDescription = this.extractMetaTag(html, 'og:description');

    console.log(`image = ${ogImage ?? '(none)'}`);
    console.log(`favicon = ${faviconUrl ?? '(none)'}`);
    console.log(`og:description = ${ogDescription ?? '(none)'}`);

    let localImagePath: string | null = null;
    if (ogImage) {
      localImagePath = await this.downloadImage(ogImage, itemId);
      if (localImagePath) {
        console.log(`Image saved to ${localImagePath}`);
      }
    }

    let localFaviconPath: string | null = null;
    if (faviconUrl) {
      localFaviconPath = await this.downloadFavicon(faviconUrl, itemId);
      if (localFaviconPath) {
        console.log(`Favicon saved to ${localFaviconPath}`);
      }
    }

    let metadata = await this.metadataRepo.findOneBy({ id: itemId });
    if (!metadata) {
      metadata = this.metadataRepo.create({ id: itemId });
    }
    metadata.og_image = ogImage;
    metadata.og_description = ogDescription;
    metadata.local_image_path = localImagePath;
    metadata.favicon_url = faviconUrl;
    metadata.local_favicon_path = localFaviconPath;
    metadata.fetch_failed = false;
    metadata.fetch_attempt_count = (metadata.fetch_attempt_count ?? 0) + 1;
    metadata.last_fetch_attempted_at = new Date();
    await this.metadataRepo.save(metadata);

    console.log(`Metadata saved for item ${itemId}`);
  }

  private async recordFetchFailure(itemId: number): Promise<void> {
    let metadata = await this.metadataRepo.findOneBy({ id: itemId });
    if (!metadata) {
      metadata = this.metadataRepo.create({ id: itemId });
    }
    metadata.fetch_failed = true;
    metadata.fetch_attempt_count = (metadata.fetch_attempt_count ?? 0) + 1;
    metadata.last_fetch_attempted_at = new Date();
    await this.metadataRepo.save(metadata);
  }

  extractMetaTag(html: string, property: string): string | null {
    const escapedProp = property.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    const regex = new RegExp(
      `<meta\\s+[^>]*?property\\s*=\\s*["']${escapedProp}["'][^>]*?content\\s*=\\s*["']([^"']+)["'][^>]*?\\/?>`,
      'i',
    );
    const match = html.match(regex);
    if (match) return match[1];

    const regexReversed = new RegExp(
      `<meta\\s+[^>]*?content\\s*=\\s*["']([^"']+)["'][^>]*?property\\s*=\\s*["']${escapedProp}["'][^>]*?\\/?>`,
      'i',
    );
    const matchReversed = html.match(regexReversed);
    return matchReversed ? matchReversed[1] : null;
  }

  extractImageUrl(html: string): string | null {
    return (
      this.extractMetaTag(html, 'og:image') ??
      this.extractMetaName(html, 'twitter:image') ??
      this.extractMetaName(html, 'image') ??
      this.extractLinkHref(html, 'image_src')
    );
  }

  extractMetaName(html: string, name: string): string | null {
    const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    const regex = new RegExp(
      `<meta\\s+[^>]*?name\\s*=\\s*["']${escapedName}["'][^>]*?content\\s*=\\s*["']([^"']+)["'][^>]*?\\/?>`,
      'i',
    );
    const match = html.match(regex);
    if (match) return match[1];

    const regexReversed = new RegExp(
      `<meta\\s+[^>]*?content\\s*=\\s*["']([^"']+)["'][^>]*?name\\s*=\\s*["']${escapedName}["'][^>]*?\\/?>`,
      'i',
    );
    const matchReversed = html.match(regexReversed);
    return matchReversed ? matchReversed[1] : null;
  }

  extractLinkHref(html: string, rel: string): string | null {
    const escapedRel = rel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    const regex = new RegExp(
      `<link\\s+[^>]*?rel\\s*=\\s*["']${escapedRel}["'][^>]*?href\\s*=\\s*["']([^"']+)["'][^>]*?\\/?>`,
      'i',
    );
    const match = html.match(regex);
    if (match) return match[1];

    const regexReversed = new RegExp(
      `<link\\s+[^>]*?href\\s*=\\s*["']([^"']+)["'][^>]*?rel\\s*=\\s*["']${escapedRel}["'][^>]*?\\/?>`,
      'i',
    );
    const matchReversed = html.match(regexReversed);
    return matchReversed ? matchReversed[1] : null;
  }

  extractFaviconUrl(html: string, pageUrl: string): string | null {
    const faviconHref =
      this.extractLinkHrefByRel(html, ['apple-touch-icon']) ??
      this.extractLinkHrefByRel(html, ['apple-touch-icon-precomposed']) ??
      this.extractLinkHrefByRel(html, ['icon']) ??
      this.extractLinkHrefByRel(html, ['shortcut', 'icon']);

    return this.resolveUrl(faviconHref ?? '/favicon.ico', pageUrl);
  }

  private extractLinkHrefByRel(html: string, requiredRelTokens: string[]): string | null {
    const linkTagRegex = /<link\s+[^>]*?>/gi;
    const required = requiredRelTokens.map((token) => token.toLowerCase());
    let match: RegExpExecArray | null;

    while ((match = linkTagRegex.exec(html)) !== null) {
      const tag = match[0];
      const rel = this.extractAttribute(tag, 'rel');
      const href = this.extractAttribute(tag, 'href');

      if (!rel || !href) continue;

      const relTokens = rel.toLowerCase().split(/\s+/);
      if (required.every((token) => relTokens.includes(token))) {
        return href;
      }
    }

    return null;
  }

  private extractAttribute(tag: string, attribute: string): string | null {
    const escapedAttribute = attribute.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(
      `\\s${escapedAttribute}\\s*=\\s*(["'])(.*?)\\1`,
      'i',
    );
    const match = tag.match(regex);
    return match ? match[2] : null;
  }

  private resolveUrl(candidate: string, pageUrl: string): string | null {
    try {
      return new URL(candidate, pageUrl).toString();
    } catch {
      return null;
    }
  }

  private async downloadImage(
    imageUrl: string,
    itemId: number,
  ): Promise<string | null> {
    return this.downloadAndConvertImage(imageUrl, itemId, {
      directory: IMAGES_DIR,
      filename: `${itemId}.webp`,
      width: 160,
      height: 120,
      fit: 'cover',
    });
  }

  private async downloadFavicon(
    faviconUrl: string,
    itemId: number,
  ): Promise<string | null> {
    try {
      const imageBuffer = await this.downloadImageBuffer(faviconUrl, itemId);

      fs.mkdirSync(FAVICONS_DIR, { recursive: true });

      const filename = `${itemId}.webp`;
      const filepath = path.join(FAVICONS_DIR, filename);
      const iconBuffer = await this.createFaviconIconBuffer(imageBuffer);

      await sharp({
        create: {
          width: 160,
          height: 120,
          channels: 3,
          background: { r: 255, g: 255, b: 255 },
        },
      })
        .composite([{ input: iconBuffer, gravity: 'center' }])
        .webp({ quality: 80 })
        .toFile(filepath);

      return filename;
    } catch (err) {
      console.error(`Failed to download favicon for item ${itemId} from ${faviconUrl}: ${err.message ?? err}`);
      return null;
    }
  }

  private async createFaviconIconBuffer(imageBuffer: Buffer): Promise<Buffer> {
    try {
      return await this.resizeFaviconIcon(imageBuffer);
    } catch (err) {
      if (!this.isIcoBuffer(imageBuffer)) {
        throw err;
      }

      const decodedImages = decodeIco(imageBuffer) as IcoDecodeImage[];
      const largestImage = decodedImages
        .filter((image) => image.width > 0 && image.height > 0)
        .sort((a, b) => b.width * b.height - a.width * a.height)[0];

      if (!largestImage) {
        throw err;
      }

      return this.resizeFaviconIcon(await this.icoImageToPngBuffer(largestImage));
    }
  }

  private isIcoBuffer(imageBuffer: Buffer): boolean {
    return (
      imageBuffer.length >= 6 &&
      imageBuffer.readUInt16LE(0) === 0 &&
      imageBuffer.readUInt16LE(2) === 1 &&
      imageBuffer.readUInt16LE(4) > 0
    );
  }

  private async icoImageToPngBuffer(image: IcoDecodeImage): Promise<Buffer> {
    if (image.type === 'png') {
      return Buffer.from(image.data);
    }

    return sharp(Buffer.from(image.data), {
      raw: {
        width: image.width,
        height: image.height,
        channels: 4,
      },
    })
      .png()
      .toBuffer();
  }

  private async resizeFaviconIcon(imageBuffer: Buffer): Promise<Buffer> {
    return sharp(imageBuffer)
      .resize(48, 48, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 0 },
      })
      .png()
      .toBuffer();
  }

  private async downloadAndConvertImage(
    imageUrl: string,
    itemId: number,
    options: ImageDownloadOptions,
  ): Promise<string | null> {
    try {
      const imageBuffer = await this.downloadImageBuffer(imageUrl, itemId);

      fs.mkdirSync(options.directory, { recursive: true });

      const filepath = path.join(options.directory, options.filename);

      await sharp(imageBuffer)
        .resize(options.width, options.height, {
          fit: options.fit,
          background: { r: 255, g: 255, b: 255, alpha: 0 },
        })
        .webp({ quality: 80 })
        .toFile(filepath);

      return options.filename;
    } catch (err) {
      console.error(`Failed to download image: ${err.message ?? err}`);
      return null;
    }
  }

  private async downloadImageBuffer(
    imageUrl: string,
    itemId: number,
  ): Promise<Buffer> {
    try {
      const response = await axios.get(imageUrl, {
        timeout: 15_000,
        responseType: 'arraybuffer',
        maxContentLength: 10 * 1024 * 1024,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept-Encoding': 'gzip, deflate, br',
          'Referer': 'https://hnagg.com/',
          'Connection': 'keep-alive',
        },
      });
      return Buffer.from(response.data);
    } catch (err) {
      if (err.response?.status === 403) {
        this.logger.warn(`Axios got 403 for image ${imageUrl}, retrying with curl-impersonate`);
        const tmpFile = `/tmp/curl-img-${itemId}`;
        try {
          await execFileAsync(CURL_IMPERSONATE_BIN, [
            '--silent', '--location', '--max-time', '15',
            '--output', tmpFile,
            imageUrl,
          ]);
          return fs.readFileSync(tmpFile);
        } finally {
          if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile);
        }
      }
      throw err;
    }
  }
}
