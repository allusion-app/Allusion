import { ID } from './ID';
import { action, observable } from 'mobx';

// type SearchCriteriaValueType = 'number' | 'string' |

// Trick for converting array to type https://stackoverflow.com/a/49529930/2350481
export const NumberOperators = [
  'equals', 'notEqual',
  'smallerThan', 'smallerThanOrEquals',
  'greaterThan', 'greaterThanOrEquals',
] as const;
export type NumberOperatorType = typeof NumberOperators[number];

export const StringOperators = [
  'equals', 'notEqual',
  'contains', 'notContains',
  'startsWith', 'notStartsWith',
] as const;
export type StringOperatorType = typeof StringOperators[number];

export const BinaryOperators = [
  'equals', 'notEqual',
] as const;
export type BinaryOperatorType = typeof BinaryOperators[number];

export const ArrayOperators = [
  'contains', 'notContains',
] as const;
export type ArrayOperatorType = typeof ArrayOperators[number];

interface IBaseSearchCriteria<T> {
  key: keyof T;
  valueType: 'number' | 'date' | 'string' | 'array';
  readonly operator: NumberOperatorType | StringOperatorType | BinaryOperatorType | ArrayOperatorType;
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
export type SearchCriteria<T> = IArraySearchCriteria<T> | IStringSearchCriteria<T>
  | INumberSearchCriteria<T> | IDateSearchCriteria<T>;

export abstract class ClientBaseCriteria<T> implements IBaseSearchCriteria<T> {
  @observable public key: keyof T;
  @observable public valueType: 'number' | 'date' | 'string' | 'array';
  @observable public operator: NumberOperatorType | StringOperatorType | BinaryOperatorType | ArrayOperatorType;
  constructor(
    key: keyof T,
    valueType: 'number' | 'date' | 'string' | 'array',
    operator: NumberOperatorType | StringOperatorType | BinaryOperatorType | ArrayOperatorType,
  ) {
    this.key = key;
    this.valueType = valueType;
    this.operator = operator;
  }
}

export class ClientArraySearchCriteria<T> extends ClientBaseCriteria<T> {
  readonly value = observable<ID>([]);
  constructor(key: keyof T) {
    super(key, 'array', 'contains');
  }
  @action.bound setOperator(op: ArrayOperatorType) { this.operator = op; }
  @action.bound addID(id: ID) { this.value.push(id); }
  @action.bound removeID(id: ID) { this.value.remove(id); }
  @action.bound clearIDs() { this.value.splice(0, this.value.length); }
}

export class ClientStringSearchCriteria<T> extends ClientBaseCriteria<T> {
  @observable public value: string;
  constructor(key: keyof T, value?: string, operator?: StringOperatorType) {
    super(key, 'string', operator || 'contains');
    this.value = value || '';
  }
  @action.bound setOperator(op: StringOperatorType) { this.operator = op; }
  @action.bound setValue(str: string) { this.value = str; }
}

export class ClientNumberSearchCriteria<T> extends ClientBaseCriteria<T> {
  @observable public value: number;
  constructor(key: keyof T) {
    super(key, 'number', 'greaterThanOrEquals');
    this.value = 0;
  }
  @action.bound setOperator(op: NumberOperatorType) { this.operator = op; }
  @action.bound setValue(num: number) { this.value = num; }
}

export class ClientDateSearchCriteria<T> extends ClientBaseCriteria<T> {
  @observable public value: Date;
  constructor(key: keyof T) {
    super(key, 'date', 'equals');
    this.value = new Date();
    this.value.setHours(0, 0, 0, 0);
  }
  @action.bound setOperator(op: NumberOperatorType) { this.operator = op; }
  @action.bound setValue(date: Date) { this.value = date; }
}
