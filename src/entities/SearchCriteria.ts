import { action, observable, makeObservable } from 'mobx';

import { ID, ISerializable } from './ID';

import { camelCaseToSpaced } from 'src/frontend/utils';
import TagStore from 'src/frontend/stores/TagStore';

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

export const TagOperators = [
  'contains',
  'notContains',
  'containsRecursively',
  'containsNotRecursively',
] as const;
export type TagOperatorType = typeof TagOperators[number];

export type OperatorType =
  | TagOperatorType
  | NumberOperatorType
  | StringOperatorType
  | BinaryOperatorType;

// FFR: Boolean keys are not supported in IndexedDB/Dexie - must store booleans as 0/1
interface IBaseSearchCriteria<T> {
  key: keyof T;
  valueType: 'number' | 'date' | 'string' | 'array';
  readonly operator: OperatorType;
}

export interface ITagSearchCriteria<T> extends IBaseSearchCriteria<T> {
  value: ID[];
  operator: TagOperatorType;
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
  | ITagSearchCriteria<T>
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
    makeObservable(this);
  }

  abstract toString(): string;
  abstract serialize(): SearchCriteria<T>;
}

export class ClientTagSearchCriteria<T> extends ClientBaseCriteria<T> {
  public readonly value = observable<ID>([]);
  @observable public label: string;
  private tagStore: TagStore;

  constructor(
    tagStore: TagStore,
    key: keyof T,
    id?: ID,
    label: string = '',
    operator: TagOperatorType = 'containsRecursively',
    dict?: SearchKeyDict<T>,
  ) {
    super(key, 'array', operator, dict);
    if (id) {
      this.value.push(id);
    }
    this.label = label;
    this.tagStore = tagStore;
    makeObservable(this);
  }

  /**
   * A flag for when the tag may be interpreted as a real tag, but contains text created by the application.
   * (this makes is so that "Untagged images" can be italicized)
   **/
  isSystemTag = (): boolean => {
    return !this.value.length && !this.operator.toLowerCase().includes('not');
  };

  toString: () => string = () => {
    if (!this.value.length && !this.operator.toLowerCase().includes('not')) {
      return 'Untagged images';
    }
    return `${this.dict[this.key] || camelCaseToSpaced(this.key as string)} ${camelCaseToSpaced(
      this.operator,
    )} ${this.value.length === 0 ? 'no tags' : this.label}`;
  };

  @action.bound
  serialize = (): ITagSearchCriteria<T> => {
    // for the *recursive options, convert it to the corresponding non-recursive option,
    // by putting all child IDs in the value in the serialization step
    let op = this.operator as TagOperatorType;
    let val = this.value.toJSON();
    if (val.length > 0 && op.includes('Recursively')) {
      val =
        this.tagStore
          .get(val[0])
          ?.getSubTreeList()
          .map((t) => t.id) || [];
    }
    if (op === 'containsNotRecursively') op = 'notContains';
    if (op === 'containsRecursively') op = 'contains';

    return {
      key: this.key,
      valueType: this.valueType,
      operator: op,
      value: val,
    };
  };

  @action.bound setOperator(op: TagOperatorType): void {
    this.operator = op;
  }

  @action.bound setValue(value: ID, label: string): void {
    this.value.replace([value]);
    this.label = label;
  }
}

export class ClientStringSearchCriteria<T> extends ClientBaseCriteria<T> {
  @observable public value: string;
  @observable public label?: string;

  constructor(
    key: keyof T,
    value: string = '',
    operator: StringOperatorType = 'contains',
    dict?: SearchKeyDict<T>,
    label?: string,
  ) {
    super(key, 'string', operator, dict);
    this.value = value;
    this.label = label;
    makeObservable(this);
  }

  toString: () => string = () =>
    `${this.dict[this.key] || camelCaseToSpaced(this.key as string)} ${camelCaseToSpaced(
      this.operator,
    )} "${this.label || this.value}"`;

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
    makeObservable(this);
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
    makeObservable(this);
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
