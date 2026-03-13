import { Module } from '@nestjs/common';
import { AppModule } from '../app.module';
import { HnModule } from '../hn/hn.module';
import { FetchOgMetadataCommand } from './fetch-og-metadata.command';
import { FetchOgMetadataForDateCommand } from './fetch-og-metadata-for-date.command';
import { HelloCommand } from './hello.command';
import { ImportDataCommand } from './import-data.command';
import { OgMetadataService } from './og-metadata.service';
import { StreamUpdatesCommand } from './stream-updates.command';

@Module({
  imports: [AppModule, HnModule],
  providers: [
    HelloCommand,
    ImportDataCommand,
    StreamUpdatesCommand,
    FetchOgMetadataCommand,
    FetchOgMetadataForDateCommand,
    OgMetadataService,
  ],
})
export class CliModule { }
