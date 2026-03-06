import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { HnItem } from '../database/entities/hn-item.entity';
import { DescendantsSnapshot } from '../database/entities/descendants-snapshot.entity';
import { ScoreSnapshot } from '../database/entities/score-snapshot.entity';
import { HnApiService, HnApiItem } from './hn-api.service';

const BATCH_SIZE = 8;

@Injectable()
export class HnImportService {
  constructor(
    private readonly hnApiService: HnApiService,
    @InjectRepository(HnItem)
    private readonly hnItemRepository: Repository<HnItem>,
    @InjectRepository(ScoreSnapshot)
    private readonly scoreSnapshotRepository: Repository<ScoreSnapshot>,
    @InjectRepository(DescendantsSnapshot)
    private readonly descendantsSnapshotRepository: Repository<DescendantsSnapshot>,
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

      // Record initial snapshots for new stories
      if (apiItem.score != null) {
        await this.scoreSnapshotRepository.save({
          itemId: apiItem.id,
          score: apiItem.score,
        });
      }
      if (apiItem.descendants != null) {
        await this.descendantsSnapshotRepository.save({
          itemId: apiItem.id,
          descendants: apiItem.descendants,
        });
      }

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

  async syncItems(
    ids: number[],
  ): Promise<{ inserted: number; updated: number; unchanged: number; skippedNonStory: number }> {
    if (ids.length === 0) return { inserted: 0, updated: 0, unchanged: 0, skippedNonStory: 0 };

    // Load full existing records (need all fields for diffing)
    const existingItems = await this.hnItemRepository.find({
      where: { id: In(ids) },
    });
    const existingMap = new Map(existingItems.map((item) => [item.id, item]));
    const missingIds = ids.filter((id) => !existingMap.has(id));

    // --- Insert missing items ---
    const fetchedMissing: HnApiItem[] = [];
    for (let i = 0; i < missingIds.length; i += BATCH_SIZE) {
      const batch = missingIds.slice(i, i + BATCH_SIZE);
      const results = await Promise.all(
        batch.map((id) => this.hnApiService.getItem(id)),
      );
      fetchedMissing.push(...results.filter((item): item is HnApiItem => item !== null));
    }

    let inserted = 0;
    for (const apiItem of fetchedMissing) {
      await this.hnItemRepository.save(this.mapToEntity(apiItem));
      inserted++;
    }

    // --- Update existing stories ---
    const existingStories = existingItems.filter((item) => item.type === 'story');
    const skippedNonStory = existingItems.length - existingStories.length;
    const storyIds = existingStories.map((item) => item.id);

    const fetchedStories: HnApiItem[] = [];
    for (let i = 0; i < storyIds.length; i += BATCH_SIZE) {
      const batch = storyIds.slice(i, i + BATCH_SIZE);
      const results = await Promise.all(
        batch.map((id) => this.hnApiService.getItem(id)),
      );
      fetchedStories.push(...results.filter((item): item is HnApiItem => item !== null));
    }

    let updated = 0;
    let unchanged = 0;
    for (const apiItem of fetchedStories) {
      const dbItem = existingMap.get(apiItem.id)!;
      const changes = this.diffFields(dbItem, apiItem);

      if (Object.keys(changes).length > 0) {
        await this.hnItemRepository.save(this.mapToEntity(apiItem));
        updated++;

        // Record snapshots when values change
        if (changes.score && apiItem.score != null) {
          await this.scoreSnapshotRepository.save({
            itemId: apiItem.id,
            score: apiItem.score,
          });
        }
        if (changes.descendants && apiItem.descendants != null) {
          await this.descendantsSnapshotRepository.save({
            itemId: apiItem.id,
            descendants: apiItem.descendants,
          });
        }

        const summary = Object.entries(changes)
          .map(([key, { old: oldVal, new: newVal }]) => `${key} ${oldVal}→${newVal}`)
          .join(', ');
        console.log(`  📝 Story ${apiItem.id} updated: ${summary}`);
      } else {
        unchanged++;
      }
    }

    return { inserted, updated, unchanged, skippedNonStory };
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

  private diffFields(
    dbItem: HnItem,
    apiItem: HnApiItem,
  ): Record<string, { old: any; new: any }> {
    const changes: Record<string, { old: any; new: any }> = {};

    const fields: {
      key: string;
      dbVal: any;
      apiVal: any;
    }[] = [
        { key: 'score', dbVal: dbItem.score, apiVal: apiItem.score ?? null },
        { key: 'descendants', dbVal: dbItem.descendants, apiVal: apiItem.descendants ?? null },
        { key: 'title', dbVal: dbItem.title, apiVal: apiItem.title ?? null },
        { key: 'text', dbVal: dbItem.text, apiVal: apiItem.text ?? null },
        { key: 'url', dbVal: dbItem.url, apiVal: apiItem.url ?? null },
        { key: 'by', dbVal: dbItem.by, apiVal: apiItem.by ?? null },
        { key: 'dead', dbVal: dbItem.dead, apiVal: apiItem.dead ?? false },
        { key: 'deleted', dbVal: dbItem.deleted, apiVal: apiItem.deleted ?? false },
        {
          key: 'kids',
          dbVal: dbItem.kids?.length ?? 0,
          apiVal: apiItem.kids?.length ?? 0,
        },
      ];

    for (const { key, dbVal, apiVal } of fields) {
      if (dbVal !== apiVal) {
        changes[key] = { old: dbVal, new: apiVal };
      }
    }

    return changes;
  }
}
