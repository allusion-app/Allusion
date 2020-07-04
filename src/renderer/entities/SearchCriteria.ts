import { ID, ISerializable } from './ID';
import { action, observable } from 'mobx';
import { camelCaseToSpaced } from '../frontend/utils';
import { IFile } from './File';

// type SearchCriteriaValueType = 'number' | 'string' |

// A dictionary of labels for (some of) the keys of the type we search for
export type SearchKeyDict<T> = { [key in keyof Partial<T>]: string };

// Trick for converting array to type https://stackoverflow.com/a/49529930/2350481
export const NumberOperators = [
  'equals',
  'notEqual',
  'smallerThan',
  'smallerThanOrEquals',
  'greaterThan',
  'greaterThanOrEquals',
] as const;
export type NumberOperatorType = typeof NumberOperators[number];

export const NumberOperatorSymbols: { [key: string]: string } = {
  equals: '=',
  notEqual: '≠',
  smallerThan: '<',
  smallerThanOrEquals: '≤',
  greaterThan: '>',
  greaterThanOrEquals: '≥',
};

export const StringOperators = [
  'equals',
  'notEqual',
  'contains',
  'notContains',
  'startsWith',
  'notStartsWith',
] as const;
export type StringOperatorType = typeof StringOperators[number];

export const BinaryOperators = ['equals', 'notEqual'] as const;
export type BinaryOperatorType = typeof BinaryOperators[number];

export const ArrayOperators = ['contains', 'notContains'] as const;
export type ArrayOperatorType = typeof ArrayOperators[number];

export type OperatorType =
  | ArrayOperatorType
  | NumberOperatorType
  | StringOperatorType
  | BinaryOperatorType;

// FFR: Boolean keys are not supported in IndexedDB/Dexie - must store booleans as 0/1
interface IBaseSearchCriteria<T> {
  key: keyof T;
  valueType: 'number' | 'date' | 'string' | 'array';
  readonly operator: OperatorType;
}

export interface IArraySearchCriteria<T> extends IBaseSearchCriteria<T> {
  value: ID[];
  operator: ArrayOperatorType;
}

export interface IStringSearchCriteria<T> extends IBaseSearchCriteria<T> {
  value: string;
  operator: StringOperatorType;
}

export interface INumberSearchCriteria<T> extends IBaseSearchCriteria<T> {
  value: number;
  operator: NumberOperatorType;
}

export interface IDateSearchCriteria<T> extends IBaseSearchCriteria<T> {
  value: Date;
  operator: NumberOperatorType;
}

// General search criteria for a database entity
export type SearchCriteria<T> =
  | IArraySearchCriteria<T>
  | IStringSearchCriteria<T>
  | INumberSearchCriteria<T>
  | IDateSearchCriteria<T>;

export abstract class ClientBaseCriteria<T>
  implements IBaseSearchCriteria<T>, ISerializable<SearchCriteria<T>> {
  @observable public key: keyof T;
  @observable public valueType: 'number' | 'date' | 'string' | 'array';
  @observable public operator: OperatorType;
  readonly dict: SearchKeyDict<T>;

  constructor(
    key: keyof T,
    valueType: 'number' | 'date' | 'string' | 'array',
    operator: OperatorType,
    dict?: SearchKeyDict<T>,
  ) {
    this.key = key;
    this.valueType = valueType;
    this.operator = operator;
    this.dict = dict || ({} as SearchKeyDict<T>);
  }

  abstract toString(): string;
  abstract serialize(): SearchCriteria<T>;
}

export class ClientArraySearchCriteria<T> extends ClientBaseCriteria<T> {
  readonly value = observable<ID>([]);

  constructor(
    key: keyof T,
    ids?: ID[],
    operator: ArrayOperatorType = 'contains',
    dict?: SearchKeyDict<T>,
  ) {
    super(key, 'array', operator, dict);
    if (ids) {
      this.value.push(...ids);
    }
  }

  toString: () => string = () => this.value.toString();

  serialize = (): IArraySearchCriteria<T> => {
    return {
      key: this.key,
      valueType: this.valueType,
      operator: this.operator as ArrayOperatorType,
      value: this.value.toJS(),
    };
  };

  @action.bound setOperator(op: ArrayOperatorType): void {
    this.operator = op;
  }

  @action.bound addID(id: ID): void {
    this.value.push(id);
  }

  @action.bound removeID(id: ID): void {
    this.value.remove(id);
  }

  @action.bound clearIDs(): void {
    this.value.clear();
  }
}

export class ClientIDSearchCriteria<T> extends ClientBaseCriteria<T> {
  @observable public value: ID[];
  @observable public label: string;

  constructor(
    key: keyof T,
    id?: ID,
    label: string = '',
    operator: ArrayOperatorType = 'contains',
    dict?: SearchKeyDict<T>,
  ) {
    super(key, 'array', operator, dict);
    this.value = id ? [id] : [];
    this.label = label;
  }

  toString: () => string = () =>
    `${this.dict[this.key] || camelCaseToSpaced(this.key as string)} ${camelCaseToSpaced(
      this.operator,
    )} ${this.label}`;

  serialize = (): IArraySearchCriteria<T> => {
    return {
      key: this.key,
      valueType: this.valueType,
      operator: this.operator as ArrayOperatorType,
      value: this.value,
    };
  };

  @action.bound setOperator(op: ArrayOperatorType): void {
    this.operator = op;
  }

  @action.bound setValue(value: ID, label: string): void {
    this.value = value ? [value] : [];
    this.label = label;
  }
}

export class ClientStringSearchCriteria<T> extends ClientBaseCriteria<T> {
  @observable public value: string;

  constructor(
    key: keyof T,
    value: string = '',
    operator: StringOperatorType = 'contains',
    dict?: SearchKeyDict<T>,
  ) {
    super(key, 'string', operator, dict);
    this.value = value;
  }

  toString: () => string = () =>
    `${this.dict[this.key] || camelCaseToSpaced(this.key as string)} ${camelCaseToSpaced(
      this.operator,
    )} "${this.value}"`;

  serialize = (): IStringSearchCriteria<T> => {
    return {
      key: this.key,
      valueType: this.valueType,
      operator: this.operator as StringOperatorType,
      value: this.value,
    };
  };

  @action.bound setOperator(op: StringOperatorType): void {
    this.operator = op;
  }

  @action.bound setValue(str: string): void {
    this.value = str;
  }
}

export class ClientNumberSearchCriteria<T> extends ClientBaseCriteria<T> {
  @observable public value: number;

  constructor(
    key: keyof T,
    value: number = 0,
    operator: NumberOperatorType = 'greaterThanOrEquals',
    dict?: SearchKeyDict<T>,
  ) {
    super(key, 'number', operator, dict);
    this.value = value;
  }
  toString: () => string = () =>
    `${camelCaseToSpaced(this.key as string)} ${
      NumberOperatorSymbols[this.operator] || camelCaseToSpaced(this.operator)
    } ${this.value}`;

  serialize = (): INumberSearchCriteria<T> => {
    return {
      key: this.key,
      valueType: this.valueType,
      operator: this.operator as NumberOperatorType,
      value: this.value,
    };
  };

  @action.bound setOperator(op: NumberOperatorType): void {
    this.operator = op;
  }

  @action.bound setValue(num: number): void {
    this.value = num;
  }
}

export class ClientDateSearchCriteria<T> extends ClientBaseCriteria<T> {
  @observable public value: Date;

  constructor(
    key: keyof T,
    value: Date = new Date(),
    operator: NumberOperatorType = 'equals',
    dict?: SearchKeyDict<T>,
  ) {
    super(key, 'date', operator, dict);
    this.value = value;
    this.value.setHours(0, 0, 0, 0);
  }

  toString: () => string = () =>
    `${this.dict[this.key] || camelCaseToSpaced(this.key as string)} ${
      NumberOperatorSymbols[this.operator] || camelCaseToSpaced(this.operator)
    } ${this.value.toLocaleDateString()}`;

  serialize = (): IDateSearchCriteria<T> => {
    return {
      key: this.key,
      valueType: this.valueType,
      operator: this.operator as NumberOperatorType,
      value: this.value,
    };
  };

  @action.bound setOperator(op: NumberOperatorType): void {
    this.operator = op;
  }

  @action.bound setValue(date: Date): void {
    this.value = date;
  }
}

export class ClientCollectionSearchCriteria extends ClientArraySearchCriteria<IFile> {
  @observable public collectionId: ID;
  @observable public label: string;

  constructor(
    collectionId: ID,
    tagIDs: ID[],
    label: string,
    operator?: ArrayOperatorType,
    dict?: SearchKeyDict<IFile>,
  ) {
    super('tags', tagIDs, operator, dict);
    this.collectionId = collectionId;
    this.label = label;
  }

  toString: () => string = () =>
    `${this.dict[this.key] || camelCaseToSpaced(this.key as string)} ${camelCaseToSpaced(
      this.operator,
    )} ${this.label}`;

  @action.bound setValue(collectionId: ID, tagIDs: ID[], label: string): void {
    this.collectionId = collectionId;
    this.value.clear();
    this.value.push(...tagIDs);
    this.label = label;
  }
}
