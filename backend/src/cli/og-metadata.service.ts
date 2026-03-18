import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import sharp from 'sharp';
import { HnItem } from '../database/entities/hn-item.entity';
import { HnItemMetadata } from '../database/entities/hn-item-metadata.entity';
import { etDateToUtcRange } from '../common/timezone';

const IMAGES_DIR = '/app/images';

@Injectable()
export class OgMetadataService {
  private readonly logger = new Logger(OgMetadataService.name);

  constructor(
    @InjectRepository(HnItem)
    private readonly hnItemRepo: Repository<HnItem>,
    @InjectRepository(HnItemMetadata)
    private readonly metadataRepo: Repository<HnItemMetadata>,
  ) {}

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
      .andWhere('item.url IS NOT NULL')
      .orderBy('item.score', 'DESC', 'NULLS LAST')
      .addOrderBy('item.id', 'ASC')
      .limit(150)
      .getMany();

    let items: HnItem[];
    if (force) {
      items = allItems;
    } else {
      const itemIds = allItems.map((i) => i.id);
      const existingIds = new Set(
        itemIds.length > 0
          ? (
              await this.metadataRepo
                .createQueryBuilder('meta')
                .select('meta.id')
                .where('meta.id IN (:...ids)', { ids: itemIds })
                .getMany()
            ).map((m) => m.id)
          : [],
      );
      items = allItems.filter((i) => !existingIds.has(i.id));
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
        await this.fetchAndStoreOgMetadata(item.id, item.url!);
      } catch (err) {
        this.logger.error(`Failed for item ${item.id}: ${err.message ?? err}`);
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
  }

  async fetchAndStoreOgMetadata(
    itemId: number,
    url: string,
  ): Promise<void> {
    const { data: html } = await axios.get<string>(url, {
      timeout: 10_000,
      maxRedirects: 5,
      responseType: 'text',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        Accept: 'text/html',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });

    const ogImage = this.extractImageUrl(html);
    const ogDescription = this.extractMetaTag(html, 'og:description');

    console.log(`image = ${ogImage ?? '(none)'}`);
    console.log(`og:description = ${ogDescription ?? '(none)'}`);

    let localImagePath: string | null = null;
    if (ogImage) {
      localImagePath = await this.downloadImage(ogImage, itemId);
      if (localImagePath) {
        console.log(`Image saved to ${localImagePath}`);
      }
    }

    let metadata = await this.metadataRepo.findOneBy({ id: itemId });
    if (!metadata) {
      metadata = this.metadataRepo.create({ id: itemId });
    }
    metadata.og_image = ogImage;
    metadata.og_description = ogDescription;
    metadata.local_image_path = localImagePath;
    await this.metadataRepo.save(metadata);

    console.log(`Metadata saved for item ${itemId}`);
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

  private async downloadImage(
    imageUrl: string,
    itemId: number,
  ): Promise<string | null> {
    try {
      const response = await axios.get(imageUrl, {
        timeout: 15_000,
        responseType: 'arraybuffer',
        maxContentLength: 10 * 1024 * 1024,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
          'Accept-Language': 'en-US,en;q=0.9',
        },
      });

      fs.mkdirSync(IMAGES_DIR, { recursive: true });

      const filename = `${itemId}.webp`;
      const filepath = path.join(IMAGES_DIR, filename);

      await sharp(Buffer.from(response.data))
        .resize(160, 120, { fit: 'cover' })
        .webp({ quality: 80 })
        .toFile(filepath);

      return filename;
    } catch (err) {
      console.error(`Failed to download image: ${err.message ?? err}`);
      return null;
    }
  }
}
