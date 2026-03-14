import { Command, CommandRunner, Option } from 'nest-commander';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HnItem } from '../database/entities/hn-item.entity';
import { HnItemMetadata } from '../database/entities/hn-item-metadata.entity';
import { OgMetadataService } from './og-metadata.service';
import { etDateToUtcRange } from '../common/timezone';

@Command({
  name: 'fetch-og-metadata-for-date',
  description:
    'Fetch OG metadata for the top 150 stories on a given date',
  arguments: '<date>',
})
export class FetchOgMetadataForDateCommand extends CommandRunner {
  constructor(
    @InjectRepository(HnItem)
    private readonly hnItemRepo: Repository<HnItem>,
    @InjectRepository(HnItemMetadata)
    private readonly metadataRepo: Repository<HnItemMetadata>,
    private readonly ogMetadataService: OgMetadataService,
  ) {
    super();
  }

  async run(params: string[], options?: { force?: boolean }): Promise<void> {
    const dateStr = params[0];
    const force = options?.force ?? false;

    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      console.error('Invalid date format. Expected YYYY-MM-DD.');
      process.exitCode = 1;
      return;
    }

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

    console.log(
      `Found ${allItems.length} top stories for ${dateStr} (processing ${items.length}${force ? ', force mode' : `, skipping ${allItems.length - items.length} with existing metadata`})`,
    );

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      console.log(
        `Processing ${i + 1}/${items.length}: item ${item.id} — ${item.url}`,
      );

      try {
        if (force) {
          await this.ogMetadataService.deleteLocalImage(item.id);
        }
        await this.ogMetadataService.fetchAndStoreOgMetadata(item.id, item.url!);
      } catch (err) {
        console.error(`Failed for item ${item.id}: ${err.message ?? err}`);
      }
    }

    console.log('Done.');
  }

  @Option({
    flags: '--force',
    description: 'Refetch OG metadata for all items, even if they already have metadata',
  })
  parseForce(): boolean {
    return true;
  }
}
