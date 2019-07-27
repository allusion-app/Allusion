import { ID } from './ID';

type SearchCriteriaAction = 'include' | 'exclude';
type SearchCriteriaOperator = 'and' | 'or';
type SearchCriteriaEqualitySign = 'greater' | 'smaller' | 'equal';

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
  equalitySign: SearchCriteriaEqualitySign;
}

export interface IDateSearchCriteria<T> extends IBaseSearchCriteria<T> {
  value: Date;
  equalitySign: SearchCriteriaEqualitySign;
}

// General search criteria for a database entity
export type SearchCriteria<T> = IIDSearchCriteria<T> | IIDsSearchCriteria<T> | IStringSearchCriteria<T>
  | INumberSearchCriteria<T> | IDateSearchCriteria<T>;

/**
 * Thoughts:
 * - Advanced search overlay:
 *  - Can't see content, so no real-time search
 * - Quick search
 *  - How to display? Omnibar? Sidebar? Like in chrome/vscode (widget in top right)?
 * - How to switch between what content you're viewing (All images vs untagged imagesvs searched images).
 *  - And how to make it clear what you're currently viewing?
 */
