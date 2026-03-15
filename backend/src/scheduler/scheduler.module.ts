import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { HnModule } from '../hn/hn.module';
import { OgMetadataService } from '../cli/og-metadata.service';
import { OgMetadataSchedulerService } from './og-metadata-scheduler.service';

@Module({
  imports: [ScheduleModule.forRoot(), HnModule],
  providers: [OgMetadataService, OgMetadataSchedulerService],
})
export class SchedulerModule {}
