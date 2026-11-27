import type { SearchResults } from './search.types';

export const SEARCH_REPOSITORY = Symbol('SEARCH_REPOSITORY');

export interface SearchRepository {
  search(term: string): Promise<SearchResults>;
}
