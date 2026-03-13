import { Module } from '@nestjs/common';
import { AppModule } from '../app.module';
import { HnModule } from '../hn/hn.module';
import { ExtractOgImageCommand } from './extract-og-image.command';
import { HelloCommand } from './hello.command';
import { ImportDataCommand } from './import-data.command';
import { StreamUpdatesCommand } from './stream-updates.command';

@Module({
  imports: [AppModule, HnModule],
  providers: [HelloCommand, ImportDataCommand, StreamUpdatesCommand, ExtractOgImageCommand],
})
export class CliModule { }
