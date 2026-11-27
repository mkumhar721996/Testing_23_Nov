import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { SampleSearchRepository } from './sample-search.repository';
import { SearchController } from './search.controller';
import { SEARCH_REPOSITORY } from './search.repository';
import { SearchService } from './search.service';

@Module({
  imports: [AuthModule],
  controllers: [SearchController],
  providers: [SearchService, { provide: SEARCH_REPOSITORY, useClass: SampleSearchRepository }],
})
export class SearchModule {}
