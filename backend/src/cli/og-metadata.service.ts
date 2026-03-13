import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import { HnItemMetadata } from '../database/entities/hn-item-metadata.entity';

const IMAGES_DIR = '/app/images';

@Injectable()
export class OgMetadataService {
  constructor(
    @InjectRepository(HnItemMetadata)
    private readonly metadataRepo: Repository<HnItemMetadata>,
  ) {}

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
        responseType: 'stream',
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; HNAggregator/1.0)',
        },
      });

      const contentType: string = response.headers['content-type'] || '';
      const ext = this.extFromContentType(contentType);

      fs.mkdirSync(IMAGES_DIR, { recursive: true });

      const filename = `${itemId}${ext}`;
      const filepath = path.join(IMAGES_DIR, filename);

      const writer = fs.createWriteStream(filepath);
      response.data.pipe(writer);

      await new Promise<void>((resolve, reject) => {
        writer.on('finish', resolve);
        writer.on('error', reject);
      });

      return filename;
    } catch (err) {
      console.error(`Failed to download image: ${err.message ?? err}`);
      return null;
    }
  }

  private extFromContentType(contentType: string): string {
    if (contentType.includes('png')) return '.png';
    if (contentType.includes('gif')) return '.gif';
    if (contentType.includes('webp')) return '.webp';
    if (contentType.includes('svg')) return '.svg';
    return '.jpg';
  }
}
