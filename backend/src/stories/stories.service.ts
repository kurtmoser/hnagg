import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  And,
  FindOptionsWhere,
  LessThan,
  MoreThanOrEqual,
  Repository,
} from 'typeorm';
import { HnItem } from '../database/entities/hn-item.entity';
import { etMidnightAsUtc } from '../common/timezone';
import { DescendantsSnapshot } from '../database/entities/descendants-snapshot.entity';
import { ScoreSnapshot } from '../database/entities/score-snapshot.entity';
import { PaginatedResponseDto } from './dto/paginated-response.dto';

@Injectable()
export class StoriesService {
  constructor(
    @InjectRepository(HnItem)
    private readonly hnItemRepo: Repository<HnItem>,
    @InjectRepository(ScoreSnapshot)
    private readonly scoreSnapshotRepo: Repository<ScoreSnapshot>,
    @InjectRepository(DescendantsSnapshot)
    private readonly descendantsSnapshotRepo: Repository<DescendantsSnapshot>,
  ) {}

  async findPaginated(
    page: number,
    limit: number,
    from?: string,
    to?: string,
  ): Promise<PaginatedResponseDto<HnItem>> {
    const where: FindOptionsWhere<HnItem> = {
      type: 'story',
      deleted: false,
      dead: false,
    };

    if (from && to) {
      where.time = And(
        MoreThanOrEqual(etMidnightAsUtc(from)),
        LessThan(etMidnightAsUtc(to)),
      );
    } else if (from) {
      where.time = MoreThanOrEqual(etMidnightAsUtc(from));
    } else if (to) {
      where.time = LessThan(etMidnightAsUtc(to));
    }

    const [data, totalItems] = await this.hnItemRepo.findAndCount({
      where,
      relations: ['metadata'],
      order: {
        score: { direction: 'DESC', nulls: 'LAST' },
        descendants: { direction: 'DESC', nulls: 'LAST' },
        id: 'ASC',
      },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      data,
      meta: {
        page,
        limit,
        totalItems,
        totalPages: Math.ceil(totalItems / limit),
      },
    };
  }

  private topTitleCache: {
    key: string;
    expires: number;
    data: Map<string, string | null>;
  } | null = null;

  /**
   * Top story title per Eastern Time day from `fromDate` on, ordered the same
   * way as findPaginated. Only days that have stories are present. Cached for
   * 10 minutes since it scans every story in the range.
   */
  async findTopTitlePerDay(
    fromDate: string,
  ): Promise<Map<string, string | null>> {
    const now = Date.now();
    const cache = this.topTitleCache;
    if (cache && cache.key === fromDate && cache.expires > now) {
      return cache.data;
    }

    const rows: Array<{ d: string; title: string | null }> =
      await this.hnItemRepo.query(
        `SELECT DISTINCT ON (d) d, title FROM (
           SELECT to_char((time AT TIME ZONE 'UTC') AT TIME ZONE 'America/New_York', 'YYYY-MM-DD') AS d,
                  title, score, descendants, id
           FROM hn_items
           WHERE type = 'story' AND deleted = false AND dead = false AND time >= $1
         ) s
         ORDER BY d, score DESC NULLS LAST, descendants DESC NULLS LAST, id ASC`,
        [etMidnightAsUtc(fromDate)],
      );

    const data = new Map(rows.map((r) => [r.d, r.title]));
    this.topTitleCache = { key: fromDate, expires: now + 10 * 60_000, data };
    return data;
  }

  async getScoreHistory(
    itemId: number,
  ): Promise<Pick<ScoreSnapshot, 'score' | 'recordedAt'>[]> {
    return this.scoreSnapshotRepo.find({
      where: { itemId },
      order: { recordedAt: 'ASC' },
      select: ['score', 'recordedAt'],
    });
  }

  async getDescendantsHistory(
    itemId: number,
  ): Promise<Pick<DescendantsSnapshot, 'descendants' | 'recordedAt'>[]> {
    return this.descendantsSnapshotRepo.find({
      where: { itemId },
      order: { recordedAt: 'ASC' },
      select: ['descendants', 'recordedAt'],
    });
  }
}
