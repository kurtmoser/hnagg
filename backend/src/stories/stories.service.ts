import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HnItem } from '../database/entities/hn-item.entity';
import { PaginatedResponseDto } from './dto/paginated-response.dto';

@Injectable()
export class StoriesService {
  constructor(
    @InjectRepository(HnItem)
    private readonly hnItemRepo: Repository<HnItem>,
  ) { }

  async findPaginated(
    page: number,
    limit: number,
  ): Promise<PaginatedResponseDto<HnItem>> {
    const [data, totalItems] = await this.hnItemRepo.findAndCount({
      where: { type: 'story', deleted: false, dead: false },
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
}
