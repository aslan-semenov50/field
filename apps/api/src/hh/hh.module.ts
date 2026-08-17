import { Module } from '@nestjs/common';
import { HhController } from './hh.controller';
import { HhService } from './hh.service';

@Module({
  controllers: [HhController],
  providers: [HhService],
})
export class HhModule {}
