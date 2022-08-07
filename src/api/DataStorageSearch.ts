export type OrderBy<T> =
  | {
      [K in keyof T]: K extends string ? K : never;
    }[keyof T]
  | 'random';

export const enum OrderDirection {
  Asc,
  Desc,
}

// General search criteria for a database entity
// FFR: Boolean keys are not supported in IndexedDB/Dexie - must store booleans as 0/1

export type ConditionDTO<T> =
  | ArrayConditionDTO<T, any>
  | StringConditionDTO<T>
  | NumberConditionDTO<T>
  | DateConditionDTO<T>;

export type ArrayConditionDTO<T, A> = BaseConditionDTO<T, ArrayOperatorType, Array<A>, 'array'>;

export type StringConditionDTO<T> = BaseConditionDTO<T, StringOperatorType, string, 'string'>;

export type NumberConditionDTO<T> = BaseConditionDTO<T, NumberOperatorType, number, 'number'>;

export type DateConditionDTO<T> = BaseConditionDTO<T, NumberOperatorType, Date, 'date'>;

type BaseConditionDTO<T, O, V, VT> = {
  key: ExtractKeyByValue<T, V>;
  operator: O;
  value: V;
  valueType: VT;
};

export type ExtractKeyByValue<T, V> = {
  [K in keyof T]: T[K] extends V ? (K extends string ? K : never) : never;
}[keyof T];

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

export const BinaryOperators = ['equals', 'notEqual'] as const;
export type BinaryOperatorType = typeof BinaryOperators[number];

export const ArrayOperators = ['contains', 'notContains'] as const;
export type ArrayOperatorType = typeof ArrayOperators[number];
