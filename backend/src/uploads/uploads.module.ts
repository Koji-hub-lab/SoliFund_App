import { Module } from '@nestjs/common';
import { ImagesService } from './images.service';
import { StockagePriveService } from './stockage-prive.service';

@Module({
  providers: [ImagesService, StockagePriveService],
  exports: [ImagesService, StockagePriveService],
})
export class UploadsModule {}
