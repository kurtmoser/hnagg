import { Command, CommandRunner } from 'nest-commander';
import { HnImportService } from '../hn/hn-import.service';

@Command({
  name: 'import-data',
  description: 'Import data from HackerNews API',
})
export class ImportDataCommand extends CommandRunner {
  constructor(private readonly hnImportService: HnImportService) {
    super();
  }

  async run(): Promise<void> {
    const result = await this.hnImportService.importLatestStories(100);
    console.log(
      `Done: ${result.imported} stories imported, ${result.skipped} non-story items skipped.`,
    );
  }
}
