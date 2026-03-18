import { Command, CommandRunner } from 'nest-commander';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import axios from 'axios';
import { HnItem } from '../database/entities/hn-item.entity';
import { OgMetadataService } from './og-metadata.service';
import { etDateToUtcRange } from '../common/timezone';

@Command({
  name: 'audit-og-availability',
  description:
    'Audit og:image availability for the top 150 stories on a given date',
  arguments: '<date>',
})
export class AuditOgAvailabilityCommand extends CommandRunner {
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

    const { from, to } = etDateToUtcRange(dateStr);

    const items = await this.hnItemRepo
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

    let withImage = 0;
    let withoutImage = 0;
    const errors = new Map<string, number>();

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      console.log(
        `Checking ${i + 1}/${items.length}: item ${item.id} — ${item.url}`,
      );

      try {
        const { data: html } = await axios.get<string>(item.url!, {
          timeout: 10_000,
          maxRedirects: 5,
          responseType: 'text',
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; HNAggregator/1.0)',
            Accept: 'text/html',
          },
        });

        const ogImage = this.ogMetadataService.extractMetaTag(
          html,
          'og:image',
        );
        if (ogImage) {
          withImage++;
        } else {
          withoutImage++;
        }
      } catch (err) {
        let key: string;
        if (err.response?.status) {
          key = String(err.response.status);
        } else if (err.code === 'ECONNABORTED') {
          key = 'timeout';
        } else {
          key = 'network_error';
        }
        errors.set(key, (errors.get(key) ?? 0) + 1);
      }
    }

    const totalErrors = Array.from(errors.values()).reduce(
      (a, b) => a + b,
      0,
    );

    console.log('');
    console.log(
      `Results for ${dateStr} (${items.length} stories with URLs):`,
    );
    console.log(`  HTML received, og:image found:      ${withImage}`);
    console.log(`  HTML received, og:image not found:   ${withoutImage}`);
    console.log(`  HTTP/network errors:                 ${totalErrors}`);
    if (errors.size > 0) {
      for (const [key, count] of [...errors.entries()].sort()) {
        console.log(`    ${key}: ${count}`);
      }
    }
  }
}

