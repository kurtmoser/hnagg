import { Module } from '@nestjs/common';
import { StoriesModule } from '../stories/stories.module';
import { PagesController } from './pages.controller';

@Module({
  imports: [StoriesModule],
  controllers: [PagesController],
})
export class PagesModule {}
