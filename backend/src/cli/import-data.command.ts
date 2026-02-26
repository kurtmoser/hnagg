import { Command, CommandRunner } from 'nest-commander';

@Command({
  name: 'import-data',
  description: 'Import data from HackerNews API',
})
export class ImportDataCommand extends CommandRunner {
  async run(): Promise<void> {
    console.log('Import data...');
  }
}
