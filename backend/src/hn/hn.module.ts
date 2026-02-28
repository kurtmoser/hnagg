import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HnItem } from '../database/entities/hn-item.entity';
import { HnApiService } from './hn-api.service';
import { HnImportService } from './hn-import.service';

@Module({
  imports: [HttpModule, TypeOrmModule.forFeature([HnItem])],
  providers: [HnApiService, HnImportService],
  exports: [HnApiService, HnImportService],
})
export class HnModule { }
