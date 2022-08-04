import { FileDTO } from './FileDTO';
import { ID } from './ID';
import { SearchCriteria } from './SearchCriteriaDTO';

export type FileSearchItemDTO = {
  id: ID;
  name: string;
  criteria: SearchCriteria<FileDTO>[];
  matchAny?: boolean;
  index: number;
};
