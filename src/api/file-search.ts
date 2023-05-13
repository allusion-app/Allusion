import { ID } from './id';
import { SearchCriteria } from './search-criteria';

export type FileSearchDTO = {
  id: ID;
  name: string;
  criteria: SearchCriteria[];
  matchAny?: boolean;
  position: string;
};
