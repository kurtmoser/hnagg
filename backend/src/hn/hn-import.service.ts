import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HnItem } from '../database/entities/hn-item.entity';
import { HnApiService, HnApiItem } from './hn-api.service';

const BATCH_SIZE = 2;

@Injectable()
export class HnImportService {
  constructor(
    private readonly hnApiService: HnApiService,
    @InjectRepository(HnItem)
    private readonly hnItemRepository: Repository<HnItem>,
  ) { }

  async importLatestStories(
    limit: number,
  ): Promise<{ imported: number; skipped: number }> {
    console.log(`\n⏳ Fetching latest story IDs from HackerNews API...`);
    const allIds = await this.hnApiService.getNewStoryIds();
    const ids = allIds.slice(0, limit);
    console.log(`📋 Got ${ids.length} story IDs. Fetching details...\n`);

    const items: HnApiItem[] = [];
    for (let i = 0; i < ids.length; i += BATCH_SIZE) {
      const batch = ids.slice(i, i + BATCH_SIZE);
      const results = await Promise.all(
        batch.map((id) => this.hnApiService.getItem(id)),
      );
      items.push(...results.filter((item): item is HnApiItem => item !== null));

      const done = Math.min(i + BATCH_SIZE, ids.length);
      const pct = Math.round((done / ids.length) * 100);
      const bar = '█'.repeat(Math.round(pct / 5)) + '░'.repeat(20 - Math.round(pct / 5));
      process.stdout.write(`\r  Fetching items [${bar}] ${done}/${ids.length} (${pct}%)`);
    }
    console.log('\n');

    const stories = items.filter((item) => item.type === 'story');
    console.log(`🔍 Found ${stories.length} stories out of ${items.length} items.`);
    console.log(`💾 Saving to database...\n`);

    let imported = 0;
    for (const apiItem of stories) {
      const entity = this.mapToEntity(apiItem);
      await this.hnItemRepository.save(entity);
      imported++;

      if (imported % 10 === 0 || imported === stories.length) {
        const pct = Math.round((imported / stories.length) * 100);
        const bar = '█'.repeat(Math.round(pct / 5)) + '░'.repeat(20 - Math.round(pct / 5));
        process.stdout.write(`\r  Saving stories [${bar}] ${imported}/${stories.length} (${pct}%)`);
      }
    }
    console.log('\n');

    const skipped = items.length - stories.length;
    console.log(`✅ Import complete: ${imported} stories imported, ${skipped} non-story items skipped.\n`);
    return { imported, skipped };
  }

  private mapToEntity(apiItem: HnApiItem): Partial<HnItem> {
    return {
      id: apiItem.id,
      type: apiItem.type,
      by: apiItem.by ?? null,
      time: new Date(apiItem.time * 1000),
      url: apiItem.url ?? null,
      title: apiItem.title ?? null,
      text: apiItem.text ?? null,
      score: apiItem.score ?? null,
      descendants: apiItem.descendants ?? null,
      kids: apiItem.kids ?? null,
      parent: apiItem.parent ?? null,
      parts: apiItem.parts ?? null,
      poll: apiItem.poll ?? null,
      dead: apiItem.dead ?? false,
      deleted: apiItem.deleted ?? false,
    };
  }
}
