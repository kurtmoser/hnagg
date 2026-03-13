import { Command, CommandRunner } from 'nest-commander';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import { HnItem } from '../database/entities/hn-item.entity';
import { HnItemMetadata } from '../database/entities/hn-item-metadata.entity';

const IMAGES_DIR = '/app/images';

@Command({
  name: 'extract-og-image',
  description: 'Extract og:image and og:description for an HN item, download image locally',
  arguments: '<itemId>',
})
export class ExtractOgImageCommand extends CommandRunner {
  constructor(
    @InjectRepository(HnItem)
    private readonly hnItemRepo: Repository<HnItem>,
    @InjectRepository(HnItemMetadata)
    private readonly metadataRepo: Repository<HnItemMetadata>,
  ) {
    super();
  }

  async run(params: string[]): Promise<void> {
    const itemId = parseInt(params[0], 10);
    if (isNaN(itemId)) {
      console.error('Usage: extract-og-image <itemId>');
      process.exitCode = 1;
      return;
    }

    const item = await this.hnItemRepo.findOneBy({ id: itemId });
    if (!item) {
      console.error(`HN item ${itemId} not found`);
      process.exitCode = 1;
      return;
    }

    if (!item.url) {
      console.error(`HN item ${itemId} has no URL`);
      process.exitCode = 1;
      return;
    }

    try {
      // Fetch HTML and extract OG tags
      const { data: html } = await axios.get<string>(item.url, {
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

      // Download image if found
      let localImagePath: string | null = null;
      if (ogImage) {
        localImagePath = await this.downloadImage(ogImage, itemId);
        if (localImagePath) {
          console.log(`Image saved to ${localImagePath}`);
        }
      }

      // Upsert metadata row
      let metadata = await this.metadataRepo.findOneBy({ id: itemId });
      if (!metadata) {
        metadata = this.metadataRepo.create({ id: itemId });
      }
      metadata.og_image = ogImage;
      metadata.og_description = ogDescription;
      metadata.local_image_path = localImagePath;
      await this.metadataRepo.save(metadata);

      console.log(`Metadata saved for item ${itemId}`);
    } catch (err) {
      console.error('Failed:', err.message ?? err);
      process.exitCode = 1;
    }
  }

  private extractMetaTag(html: string, property: string): string | null {
    const escapedProp = property.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    // property before content
    const regex = new RegExp(
      `<meta\\s+[^>]*?property\\s*=\\s*["']${escapedProp}["'][^>]*?content\\s*=\\s*["']([^"']+)["'][^>]*?\\/?>`,
      'i',
    );
    const match = html.match(regex);
    if (match) return match[1];

    // content before property
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
