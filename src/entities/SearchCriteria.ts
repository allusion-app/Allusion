import { makeObservable, observable } from 'mobx';
import {
  DateSearchCriteria,
  ExtractKeyByValue,
  NumberOperatorType,
  NumberSearchCriteria,
  StringOperatorType,
  StringSearchCriteria,
} from 'src/api/SearchCriteriaDTO';
import { IMG_EXTENSIONS_TYPE } from 'src/api/FileDTO';
import { ID } from 'src/api/ID';
import {
  BinaryOperatorType,
  ExtensionSearchCriteria,
  FileSearchCriteriaDTO,
  SearchableFileData,
  TagSearchCriteria,
  TreeOperatorType,
} from 'src/api/FileSearchDTO';

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

  public static clone(criteria: FileSearchCriteriaDTO): FileSearchCriteriaDTO {
    return new ClientFileSearchCriteria(
      criteria.key,
      criteria.operator,
      structuredClone(criteria.value),
    ) as FileSearchCriteriaDTO;
  }
}
