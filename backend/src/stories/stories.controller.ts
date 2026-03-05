import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import { HnItem } from '../database/entities/hn-item.entity';
import { ScoreSnapshot } from '../database/entities/score-snapshot.entity';
import { PaginatedResponseDto } from './dto/paginated-response.dto';
import { PaginationQueryDto } from './dto/pagination-query.dto';
import { StoriesService } from './stories.service';

@Controller('stories')
export class StoriesController {
  constructor(private readonly storiesService: StoriesService) { }

  @Get()
  findAll(
    @Query() query: PaginationQueryDto,
  ): Promise<PaginatedResponseDto<HnItem>> {
    return this.storiesService.findPaginated(query.page, query.limit, query.timeframe);
  }

  @Get(':id/score-history')
  getScoreHistory(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<Pick<ScoreSnapshot, 'score' | 'recordedAt'>[]> {
    return this.storiesService.getScoreHistory(id);
  }
}
