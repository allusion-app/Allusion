import { FileDTO } from './File';
import { ID } from './ID';
import { SearchCriteria } from './SearchCriteria';

export type FileSearchItemDTO = {
  id: ID;
  name: string;
  criteria: SearchCriteria<FileDTO>[];
  matchAny?: boolean;
  index: number;
};
