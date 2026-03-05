import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, MoreThanOrEqual, Repository } from 'typeorm';
import { HnItem } from '../database/entities/hn-item.entity';
import { PaginatedResponseDto } from './dto/paginated-response.dto';
import { Timeframe } from './dto/pagination-query.dto';

@Injectable()
export class StoriesService {
  constructor(
    @InjectRepository(HnItem)
    private readonly hnItemRepo: Repository<HnItem>,
  ) { }

  async findPaginated(
    page: number,
    limit: number,
    timeframe?: Timeframe,
  ): Promise<PaginatedResponseDto<HnItem>> {
    const where: FindOptionsWhere<HnItem> = {
      type: 'story',
      deleted: false,
      dead: false,
    };

    if (timeframe) {
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
