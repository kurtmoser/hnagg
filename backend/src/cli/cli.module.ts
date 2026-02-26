import { Module } from '@nestjs/common';
import { AppModule } from '../app.module';
import { HelloCommand } from './hello.command';
import { ImportDataCommand } from './import-data.command';

@Module({
  imports: [AppModule],
  providers: [HelloCommand, ImportDataCommand],
})
export class CliModule { }
