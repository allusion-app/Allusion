export type DBSearchCriteria<T, K> =
  | DBArraySearchCriteria<T, K>
  | DBStringSearchCriteria<T>
  | DBNumberSearchCriteria<T>
  | DBDateSearchCriteria<T>;

export type DBArraySearchCriteria<T, A> = Readonly<
  BaseSearchCriteria<T, ArrayOperatorType, Array<A>>
> & {
  valueType: 'array';
};

export type DBStringSearchCriteria<T> = Readonly<
  BaseSearchCriteria<T, StringOperatorType, string>
> & {
  valueType: 'string';
};

export type DBNumberSearchCriteria<T> = Readonly<
  BaseSearchCriteria<T, NumberOperatorType, number>
> & {
  valueType: 'number';
};

export type DBDateSearchCriteria<T> = Readonly<BaseSearchCriteria<T, NumberOperatorType, Date>> & {
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
