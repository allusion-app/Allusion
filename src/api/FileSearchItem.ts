import { ID } from './ID';
import { SearchCriteria } from './SearchCriteria';

export type FileSearchItemDTO = {
  id: ID;
  name: string;
  criteria: SearchCriteria[];
  matchAny?: boolean;
  index: number;
};
