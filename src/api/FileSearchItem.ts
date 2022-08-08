import { ID } from './ID';
import { SearchCriteria } from './SearchCriteria';

export type FileSearchItemDTO = {
  id: ID;
  name: string;
  criteria: SearchCriteria[];
  matchAny?: boolean;
  index: number;
};

// export type FileSearchItemCriteriaDTO =
//   | StringCriteriaDTO
//   | NumberCriteriaDTO
//   | DateCriteriaDTO
//   | TagCriteriaDTO
//   | ExtensionCriteriaDTO;

// export type TagCriteriaDTO = {
//   key: 'tags';
//   operator: TreeOperatorType;
//   value: ID | undefined;
// };

// export type ExtensionCriteriaDTO = {
//   key: 'extension';
//   operator: BinaryOperatorType;
//   value: IMG_EXTENSIONS_TYPE;
// };

// export type StringCriteriaDTO = {
//   key: ExtractKeyByValue<Omit<SearchableFileData, 'extension'>, string>;
//   operator: StringOperatorType;
//   value: string;
// };

// export type NumberCriteriaDTO = {
//   key: ExtractKeyByValue<SearchableFileData, number>;
//   operator: NumberOperatorType;
//   value: number;
// };

// export type DateCriteriaDTO = {
//   key: ExtractKeyByValue<SearchableFileData, Date>;
//   operator: NumberOperatorType;
//   value: Date;
// };

// export type SearchableFileData = Pick<
//   FileDTO,
//   'tags' | 'name' | 'absolutePath' | 'extension' | 'size' | 'dateAdded'
// >;

// export const TreeOperators = [
//   'contains',
//   'notContains',
//   'containsRecursively',
//   'containsNotRecursively',
// ] as const;
// export type TreeOperatorType = typeof TreeOperators[number];

// export const BinaryOperators = ['equals', 'notEqual'] as const;
// export type BinaryOperatorType = typeof BinaryOperators[number];
