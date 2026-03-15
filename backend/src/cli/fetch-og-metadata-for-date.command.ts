import { Command, CommandRunner, Option } from 'nest-commander';
import { OgMetadataService } from './og-metadata.service';

@Command({
  name: 'fetch-og-metadata-for-date',
  description:
    'Fetch OG metadata for the top 150 stories on a given date',
  arguments: '<date>',
})
export class FetchOgMetadataForDateCommand extends CommandRunner {
  constructor(
    private readonly ogMetadataService: OgMetadataService,
  ) {
    super();
  }

  async run(params: string[], options?: { force?: boolean }): Promise<void> {
    const dateStr = params[0];
    const force = options?.force ?? false;

    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      console.error('Invalid date format. Expected YYYY-MM-DD.');
      process.exitCode = 1;
      return;
    }

    await this.ogMetadataService.fetchOgMetadataForDate(dateStr, force);
  }

  @Option({
    flags: '--force',
    description: 'Refetch OG metadata for all items, even if they already have metadata',
  })
  parseForce(): boolean {
    return true;
  }
}
