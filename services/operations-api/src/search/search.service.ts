import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { SEARCH_REPOSITORY, type SearchRepository } from './search.repository';
import type { SearchResults } from './search.types';

@Injectable()
export class SearchService {
  constructor(@Inject(SEARCH_REPOSITORY) private readonly repository: SearchRepository) {}

  async search(q: string | undefined): Promise<SearchResults> {
    const term = (q ?? '').trim();
    if (term === '') throw new BadRequestException('Query parameter q must not be blank');
    return this.repository.search(term);
  }
}
