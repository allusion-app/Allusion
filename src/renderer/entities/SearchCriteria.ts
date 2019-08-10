import { ID } from './ID';

type SearchCriteriaAction = 'include' | 'exclude';
type SearchCriteriaOperator = 'and' | 'or';

// Trick for converting array to type https://stackoverflow.com/a/49529930/2350481
export const SearchCriteriaEqualitySign = ['smaller', 'greater', 'equal'];
export type SearchCriteriaEqualitySignType = typeof SearchCriteriaEqualitySign[number];

interface IBaseSearchCriteria<T> {
  key: keyof T;
  /** Operator between previous criteria and this criteria */
  operator: SearchCriteriaOperator;
  action: SearchCriteriaAction;
}

export interface IIDSearchCriteria<T> extends IBaseSearchCriteria<T> {
  value: ID;
}

export interface IIDsSearchCriteria<T> extends IBaseSearchCriteria<T> {
  value: ID[];
}

export interface IStringSearchCriteria<T> extends IBaseSearchCriteria<T> {
  value: string;
  // Whether to match with the exact value or to perform partial matches as well
  exact?: boolean;
}

export interface INumberSearchCriteria<T> extends IBaseSearchCriteria<T> {
  value: number;
  equalitySign: SearchCriteriaEqualitySignType;
}

export interface IDateSearchCriteria<T> extends IBaseSearchCriteria<T> {
  value: Date;
  equalitySign: SearchCriteriaEqualitySignType;
}

// General search criteria for a database entity
export type SearchCriteria<T> = IIDSearchCriteria<T> | IIDsSearchCriteria<T> | IStringSearchCriteria<T>
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
  const res = crit as IIDsSearchCriteria<T>;
  res.value = [];
  return res;
}

export function initStringCriteria<T>(crit: SearchCriteria<T>) {
  clearCriteria(crit);
  const res = crit as IStringSearchCriteria<T>;
  res.exact = false;
  res.value = '';
  return res;
}

export function initNumberCriteria<T>(crit: SearchCriteria<T>) {
  clearCriteria(crit);
  const res = crit as INumberSearchCriteria<T>;
  res.equalitySign = 'greater';
  return res;
}

export function initDateCriteria<T>(crit: SearchCriteria<T>) {
  clearCriteria(crit);
  const res = crit as IDateSearchCriteria<T>;
  res.equalitySign = 'greater';
  res.value = new Date();
  return res;
}
