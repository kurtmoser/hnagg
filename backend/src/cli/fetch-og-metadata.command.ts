import { Command, CommandRunner } from 'nest-commander';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HnItem } from '../database/entities/hn-item.entity';
import { OgMetadataService } from './og-metadata.service';

@Command({
  name: 'fetch-og-metadata',
  description: 'Fetch OG metadata for an HN item and download image locally',
  arguments: '<itemId>',
})
export class FetchOgMetadataCommand extends CommandRunner {
  constructor(
    @InjectRepository(HnItem)
    private readonly hnItemRepo: Repository<HnItem>,
    private readonly ogMetadataService: OgMetadataService,
  ) {
    super();
  }

  async run(params: string[]): Promise<void> {
    const itemId = parseInt(params[0], 10);
    if (isNaN(itemId)) {
      console.error('Usage: fetch-og-metadata <itemId>');
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
      await this.ogMetadataService.fetchAndStoreOgMetadata(itemId, item.url);
    } catch (err) {
      console.error('Failed:', err.message ?? err);
      process.exitCode = 1;
    }
  }
}
