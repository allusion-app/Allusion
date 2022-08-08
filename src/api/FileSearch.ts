import { ID } from './ID';
import { SearchCriteria } from './SearchCriteria';

export type FileSearchDTO = {
  id: ID;
  name: string;
  criteria: SearchCriteria[];
  matchAny?: boolean;
  index: number;
};
