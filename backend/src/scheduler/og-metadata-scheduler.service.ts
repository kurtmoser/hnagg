import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { OgMetadataService } from '../cli/og-metadata.service';

@Injectable()
export class OgMetadataSchedulerService {
  private readonly logger = new Logger(OgMetadataSchedulerService.name);

  constructor(private readonly ogMetadataService: OgMetadataService) {}

  @Cron('*/5 * * * *', { timeZone: 'America/New_York' })
  async handleCron(): Promise<void> {
    const now = new Date();
    const today = now.toLocaleDateString('en-CA', {
      timeZone: 'America/New_York',
    });
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000)
      .toLocaleDateString('en-CA', { timeZone: 'America/New_York' });

    this.logger.log(
      `Scheduled OG metadata fetch for ${today} and ${yesterday}`,
    );

    for (const dateStr of [today, yesterday]) {
      try {
        await this.ogMetadataService.fetchOgMetadataForDate(dateStr);
      } catch (err) {
        this.logger.error(
          `Failed OG metadata fetch for ${dateStr}: ${err.message ?? err}`,
        );
      }
    }
  }
}
