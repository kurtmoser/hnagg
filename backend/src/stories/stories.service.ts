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
  ) { }

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
      order: { score: { direction: 'DESC', nulls: 'LAST' }, id: 'ASC' },
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
}
