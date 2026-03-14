import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import sharp from 'sharp';
import { HnItemMetadata } from '../database/entities/hn-item-metadata.entity';

const IMAGES_DIR = '/app/images';

@Injectable()
export class OgMetadataService {
  constructor(
    @InjectRepository(HnItemMetadata)
    private readonly metadataRepo: Repository<HnItemMetadata>,
  ) {}

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
        'User-Agent': 'Mozilla/5.0 (compatible; HNAggregator/1.0)',
        Accept: 'text/html',
      },
    });

    const ogImage = this.extractMetaTag(html, 'og:image');
    const ogDescription = this.extractMetaTag(html, 'og:description');

    console.log(`og:image = ${ogImage ?? '(none)'}`);
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
          'User-Agent': 'Mozilla/5.0 (compatible; HNAggregator/1.0)',
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
