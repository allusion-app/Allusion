export type SearchCriteriaDTO<T, K> =
  | ArraySearchCriteriaDTO<T, K>
  | StringSearchCriteriaDTO<T>
  | NumberSearchCriteriaDTO<T>
  | DateSearchCriteriaDTO<T>;

export type ArraySearchCriteriaDTO<T, A> = Readonly<
  BaseSearchCriteria<T, ArrayOperatorType, Array<A>>
> & {
  valueType: 'array';
};

export type StringSearchCriteriaDTO<T> = Readonly<
  BaseSearchCriteria<T, StringOperatorType, string>
> & {
  valueType: 'string';
};

export type NumberSearchCriteriaDTO<T> = Readonly<
  BaseSearchCriteria<T, NumberOperatorType, number>
> & {
  valueType: 'number';
};

export type DateSearchCriteriaDTO<T> = Readonly<BaseSearchCriteria<T, NumberOperatorType, Date>> & {
  valueType: 'date';
};

export type ArraySearchCriteria<T, A> = BaseSearchCriteria<T, ArrayOperatorType, Array<A>>;

export type StringSearchCriteria<T> = BaseSearchCriteria<T, StringOperatorType, string>;

export type NumberSearchCriteria<T> = BaseSearchCriteria<T, NumberOperatorType, number>;

export type DateSearchCriteria<T> = BaseSearchCriteria<T, NumberOperatorType, Date>;

type BaseSearchCriteria<T, O, V> = {
  key: ExtractKeyByValue<T, V>;
  operator: O;
  value: V;
};

export type ExtractKeyByValue<T, V> = {
  [K in keyof T]: T[K] extends V ? (K extends string ? K : never) : never;
}[keyof T];

export const NumberOperators = [
  'equals',
  'notEqual',
  'smallerThan',
  'smallerThanOrEquals',
  'greaterThan',
  'greaterThanOrEquals',
] as const;
export type NumberOperatorType = typeof NumberOperators[number];

export const StringOperators = [
  'equalsIgnoreCase',
  'equals',
  'notEqual',
  'startsWithIgnoreCase',
  'startsWith',
  'notStartsWith',
  'contains',
  'notContains',
] as const;
export type StringOperatorType = typeof StringOperators[number];

export const ArrayOperators = ['contains', 'notContains'];
export type ArrayOperatorType = typeof ArrayOperators[number];
