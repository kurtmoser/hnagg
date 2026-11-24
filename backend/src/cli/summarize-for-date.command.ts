import { Command, CommandRunner, Option } from 'nest-commander';
import { SummaryService } from '../summaries/summary.service';

@Command({
  name: 'summarize-for-date',
  description:
    'Generate LLM summaries for the top 50 stories on a given date (ET)',
  arguments: '<date>',
})
export class SummarizeForDateCommand extends CommandRunner {
  constructor(private readonly summaryService: SummaryService) {
    super();
  }

  async run(params: string[], options?: { force?: boolean }): Promise<void> {
    const dateStr = params[0];

    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      console.error('Invalid date format. Expected YYYY-MM-DD.');
      process.exitCode = 1;
      return;
    }

    await this.summaryService.summarizeForDate(
      dateStr,
      options?.force ?? false,
    );
  }

  @Option({
    flags: '--force',
    description:
      'Re-summarize all top stories, even ones that already have a summary or ran out of attempts',
  })
  parseForce(): boolean {
    return true;
  }
}
