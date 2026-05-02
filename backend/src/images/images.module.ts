import { Module } from '@nestjs/common';
import { ImagesController } from './images.controller';
import { FaviconsController } from './favicons.controller';

@Module({
  controllers: [ImagesController, FaviconsController],
})
export class ImagesModule {}
