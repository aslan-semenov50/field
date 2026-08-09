import { Module } from '@nestjs/common';
import { SearchProfilesController } from './search-profiles.controller';
import { SearchProfilesService } from './search-profiles.service';

@Module({
  controllers: [SearchProfilesController],
  providers: [SearchProfilesService],
})
export class SearchProfilesModule {}
