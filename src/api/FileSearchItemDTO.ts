import { IFile } from './FileDTO';
import { ID } from './ID';
import { SearchCriteria } from './SearchCriteriaDTO';

export interface IFileSearchItem {
  id: ID;
  name: string;
  criteria: SearchCriteria<IFile>[];
  matchAny?: boolean;
  index: number;
}
