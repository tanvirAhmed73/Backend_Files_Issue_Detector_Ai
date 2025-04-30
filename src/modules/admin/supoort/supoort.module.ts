import { Module } from '@nestjs/common';
import { SupoortService } from './supoort.service';
import { SupoortController } from './supoort.controller';

@Module({
  controllers: [SupoortController],
  providers: [SupoortService],
})
export class SupoortModule {}
