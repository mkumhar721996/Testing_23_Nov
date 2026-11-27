import { Controller, Get, Inject, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { SearchService } from './search.service';
import type { SearchResults } from './search.types';

@Controller('search')
@UseGuards(AuthGuard)
export class SearchController {
  constructor(@Inject(SearchService) private readonly search: SearchService) {}

  @Get()
  find(@Query('q') q?: string): Promise<SearchResults> {
    return this.search.search(q);
  }
}
