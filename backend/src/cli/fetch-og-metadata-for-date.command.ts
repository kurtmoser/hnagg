import { Command, CommandRunner } from 'nest-commander';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HnItem } from '../database/entities/hn-item.entity';
import { OgMetadataService } from './og-metadata.service';

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
    private readonly ogMetadataService: OgMetadataService,
  ) {
    super();
  }

  async run(params: string[]): Promise<void> {
    const dateStr = params[0];
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      console.error('Invalid date format. Expected YYYY-MM-DD.');
      process.exitCode = 1;
      return;
    }

    const from = new Date(`${dateStr}T00:00:00Z`);
    const to = new Date(from);
    to.setUTCDate(to.getUTCDate() + 1);

    const items = await this.hnItemRepo
      .createQueryBuilder('item')
      .leftJoin('hn_items_metadata', 'meta', 'meta.id = item.id')
      .where('item.type = :type', { type: 'story' })
      .andWhere('item.deleted = false')
      .andWhere('item.dead = false')
      .andWhere('item.time >= :from', { from })
      .andWhere('item.time < :to', { to })
      .andWhere('meta.id IS NULL')
      .andWhere('item.url IS NOT NULL')
      .orderBy('item.score', 'DESC', 'NULLS LAST')
      .limit(150)
      .getMany();

    console.log(`Found ${items.length} stories without metadata for ${dateStr}`);

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      console.log(
        `Processing ${i + 1}/${items.length}: item ${item.id} — ${item.url}`,
      );

      try {
        await this.ogMetadataService.fetchAndStoreOgMetadata(item.id, item.url!);
      } catch (err) {
        console.error(`Failed for item ${item.id}: ${err.message ?? err}`);
      }
    }

    console.log('Done.');
  }
}
