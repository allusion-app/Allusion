import { ID } from './ID';

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
  operator: NumberOperatorType | StringOperatorType | BinaryOperatorType | ArrayOperatorType;
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

function clearCriteria(crit: SearchCriteria<any>) {
  for (const prop of Object.keys(crit)) {
    if (prop !== 'key' && prop !== 'operator' && prop !== 'action') {
      // @ts-ignore
      delete crit[prop];
    }
  }
  // @ts-ignore
  crit.value = undefined;
}

export function initIDsCriteria<T>(crit: SearchCriteria<T>) {
  clearCriteria(crit);
  const res = crit as IArraySearchCriteria<T>;
  res.value = [];
  res.valueType = 'array';
  res.operator = 'contains';
  return res;
}

export function initStringCriteria<T>(crit: SearchCriteria<T>) {
  clearCriteria(crit);
  const res = crit as IStringSearchCriteria<T>;
  res.value = '';
  res.valueType = 'string';
  res.operator = 'contains';
  return res;
}

export function initNumberCriteria<T>(crit: SearchCriteria<T>) {
  clearCriteria(crit);
  const res = crit as INumberSearchCriteria<T>;
  res.value = 0;
  res.operator = 'greaterThanOrEquals';
  res.valueType = 'number';
  return res;
}

export function initDateCriteria<T>(crit: SearchCriteria<T>) {
  clearCriteria(crit);
  const res = crit as IDateSearchCriteria<T>;
  res.operator = 'equals';
  res.valueType = 'date';
  res.value = new Date();
  res.value.setHours(0, 0, 0, 0);
  return res;
}
