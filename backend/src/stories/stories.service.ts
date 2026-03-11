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
import { DescendantsSnapshot } from '../database/entities/descendants-snapshot.entity';
import { ScoreSnapshot } from '../database/entities/score-snapshot.entity';
import { PaginatedResponseDto } from './dto/paginated-response.dto';
import { Period, Timeframe } from './dto/pagination-query.dto';

@Injectable()
export class StoriesService {
  constructor(
    @InjectRepository(HnItem)
    private readonly hnItemRepo: Repository<HnItem>,
    @InjectRepository(ScoreSnapshot)
    private readonly scoreSnapshotRepo: Repository<ScoreSnapshot>,
    @InjectRepository(DescendantsSnapshot)
    private readonly descendantsSnapshotRepo: Repository<DescendantsSnapshot>,
  ) { }

  async findPaginated(
    page: number,
    limit: number,
    timeframe?: Timeframe,
    date?: string,
    period: Period = 'day',
  ): Promise<PaginatedResponseDto<HnItem>> {
    const where: FindOptionsWhere<HnItem> = {
      type: 'story',
      deleted: false,
      dead: false,
    };

    if (date) {
      const { start, end } = this.dateToBounds(date, period);
      where.time = And(MoreThanOrEqual(start), LessThan(end));
    } else if (timeframe) {
      where.time = MoreThanOrEqual(this.timeframeToCutoff(timeframe));
    }

    const [data, totalItems] = await this.hnItemRepo.findAndCount({
      where,
      order: { score: { direction: 'DESC', nulls: 'LAST' } },
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

  private dateToBounds(
    date: string,
    period: Period,
  ): { start: Date; end: Date } {
    switch (period) {
      case 'day': {
        const start = new Date(`${date}T00:00:00Z`);
        const end = new Date(start);
        end.setUTCDate(end.getUTCDate() + 1);
        return { start, end };
      }
    }
  }

  private timeframeToCutoff(timeframe: Timeframe): Date {
    const now = new Date();
    const daysMap: Record<Timeframe, number> = {
      '1d': 1,
      '2d': 2,
      '3d': 3,
      '5d': 5,
      '1w': 7,
      '1m': 30,
    };
    now.setDate(now.getDate() - daysMap[timeframe]);
    return now;
  }
}
