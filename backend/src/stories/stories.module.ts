import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HnItem } from '../database/entities/hn-item.entity';
import { DescendantsSnapshot } from '../database/entities/descendants-snapshot.entity';
import { ScoreSnapshot } from '../database/entities/score-snapshot.entity';
import { StoriesController } from './stories.controller';
import { StoriesService } from './stories.service';

@Module({
  imports: [TypeOrmModule.forFeature([HnItem, ScoreSnapshot, DescendantsSnapshot])],
  controllers: [StoriesController],
  providers: [StoriesService],
})
export class StoriesModule { }
