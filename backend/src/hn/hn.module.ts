import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HnItem } from '../database/entities/hn-item.entity';
import { HnItemMetadata } from '../database/entities/hn-item-metadata.entity';
import { DescendantsSnapshot } from '../database/entities/descendants-snapshot.entity';
import { ScoreSnapshot } from '../database/entities/score-snapshot.entity';
import { HnApiService } from './hn-api.service';
import { HnImportService } from './hn-import.service';

@Module({
  imports: [HttpModule, TypeOrmModule.forFeature([HnItem, HnItemMetadata, ScoreSnapshot, DescendantsSnapshot])],
  providers: [HnApiService, HnImportService],
  exports: [HnApiService, HnImportService, TypeOrmModule],
})
export class HnModule { }
