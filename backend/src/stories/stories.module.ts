import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HnItem } from '../database/entities/hn-item.entity';
import { StoriesController } from './stories.controller';
import { StoriesService } from './stories.service';

@Module({
  imports: [TypeOrmModule.forFeature([HnItem])],
  controllers: [StoriesController],
  providers: [StoriesService],
})
export class StoriesModule { }
