import { makeObservable, observable } from 'mobx';
import {
  DateSearchCriteria,
  ExtractKeyByValue,
  NumberOperatorType,
  NumberSearchCriteria,
  StringOperatorType,
  StringSearchCriteria,
} from 'src/backend/DBSearchCriteria';
import { IFile, IMG_EXTENSIONS_TYPE } from 'src/entities/File';
import { ID } from 'src/entities/ID';

export type IFileSearchCriteria =
  | TagSearchCriteria
  | PathSearchCriteria
  | ExtensionSearchCriteria
  | NumberSearchCriteria<SearchableFileData>
  | DateSearchCriteria<SearchableFileData>;

export class ClientFileSearchCriteria<K, O, V> {
  @observable
  public key: K;
  @observable
  public operator: O;
  @observable
  public value: V;

  constructor(key: K, operator: O, value: V) {
    this.key = key;
    this.value = value;
    this.operator = operator;
    makeObservable(this);
  }

  public static tags(operator: TreeOperatorType, value: [] | [ID]): TagSearchCriteria {
    return new ClientFileSearchCriteria('tags', operator, value);
  }

  public static extension(
    operator: BinaryOperatorType,
    value: IMG_EXTENSIONS_TYPE,
  ): ExtensionSearchCriteria {
    return new ClientFileSearchCriteria('extension', operator, value);
  }

  public static string(
    key: ExtractKeyByValue<Omit<SearchableFileData, 'extension'>, string>,
    operator: StringOperatorType,
    value: string,
  ): StringSearchCriteria<Omit<SearchableFileData, 'extension'>> {
    return new ClientFileSearchCriteria(key, operator, value);
  }

  public static number(
    key: ExtractKeyByValue<SearchableFileData, number>,
    operator: NumberOperatorType,
    value: number,
  ): NumberSearchCriteria<SearchableFileData> {
    return new ClientFileSearchCriteria(key, operator, value);
  }

  public static date(
    key: ExtractKeyByValue<SearchableFileData, Date>,
    operator: NumberOperatorType,
    value: Date,
  ): DateSearchCriteria<SearchableFileData> {
    return new ClientFileSearchCriteria(key, operator, value);
  }

  public static clone(criteria: IFileSearchCriteria): IFileSearchCriteria {
    return new ClientFileSearchCriteria(
      criteria.key,
      criteria.operator,
      structuredClone(criteria.value),
    ) as IFileSearchCriteria;
  }
}

export type SearchableFileData = Pick<
  IFile,
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
