import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { OgMetadataService } from '../cli/og-metadata.service';
import { SummaryService } from '../summaries/summary.service';

@Injectable()
export class OgMetadataSchedulerService {
  private readonly logger = new Logger(OgMetadataSchedulerService.name);
  private running = false;

  constructor(
    private readonly ogMetadataService: OgMetadataService,
    private readonly summaryService: SummaryService,
  ) {}

  @Cron('*/5 * * * *', { timeZone: 'America/New_York' })
  async handleCron(): Promise<void> {
    if (this.running) {
      this.logger.warn('Previous OG metadata run still in progress; skipping.');
      return;
    }
    this.running = true;
    try {
      await this.run();
    } finally {
      this.running = false;
    }
  }

  private async run(): Promise<void> {
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

      try {
        await this.summaryService.summarizeForDate(dateStr);
      } catch (err) {
        this.logger.error(
          `Failed summaries for ${dateStr}: ${err.message ?? err}`,
        );
      }
    }
  }
}
