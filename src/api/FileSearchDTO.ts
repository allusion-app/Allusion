import { ID } from './ID';
import {
  DateSearchCriteria,
  NumberOperatorType,
  NumberSearchCriteria,
  StringOperatorType,
  StringSearchCriteria,
} from './SearchCriteriaDTO';
import { FileDTO, IMG_EXTENSIONS_TYPE } from './FileDTO';

export type FileSearchDTO = {
  id: ID;
  name: string;
  criterias: FileSearchCriteriaDTO[];
  matchAny: boolean;
  index: number;
};

export type FileSearchCriteriaDTO =
  | TagSearchCriteria
  | PathSearchCriteria
  | ExtensionSearchCriteria
  | NumberSearchCriteria<SearchableFileData>
  | DateSearchCriteria<SearchableFileData>;

export type FileOrder = Key<FileDTO> | 'random';

export const enum OrderDirection {
  Asc,
  Desc,
}

type Key<T> = keyof T extends string ? keyof T : never;

export type SearchableFileData = Pick<
  FileDTO,
  'tags' | 'name' | 'absolutePath' | 'extension' | 'size' | 'dateAdded'
>;

export type Operators =
  | TreeOperatorType
  | BinaryOperatorType
  | StringOperatorType
  | NumberOperatorType;

export const TreeOperators = [
  'contains',
  'notContains',
  'containsRecursively',
  'containsNotRecursively',
] as const;
export type TreeOperatorType = typeof TreeOperators[number];

export type Values = [ID] | [] | string | number | Date;

export type TagSearchCriteria = {
  key: 'tags';
  operator: TreeOperatorType;
  value: [] | [ID];
};

export type ExtensionSearchCriteria = {
  key: 'extension';
  operator: StringOperatorType;
  value: IMG_EXTENSIONS_TYPE;
};

export type PathSearchCriteria = StringSearchCriteria<Omit<SearchableFileData, 'extension'>>;

export const BinaryOperators = ['equals', 'notEqual'] as const;
export type BinaryOperatorType = typeof BinaryOperators[number];
