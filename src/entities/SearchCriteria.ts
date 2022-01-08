import { action, Lambda, makeObservable, observable, observe } from 'mobx';
import RootStore from 'src/frontend/stores/RootStore';
import { camelCaseToSpaced } from 'src/frontend/utils';
import { IFile } from './File';
import { ID, ISerializable } from './ID';

export type IFileSearchCriteria = SearchCriteria<IFile>;
export type FileSearchCriteria = ClientBaseCriteria<IFile>;

// A dictionary of labels for (some of) the keys of the type we search for
export type SearchKeyDict<T> = { [key in keyof Partial<T>]: string };

export const CustomKeyDict: SearchKeyDict<IFile> = { absolutePath: 'Path', locationId: 'Location' };

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

export const NumberOperatorSymbols: Record<NumberOperatorType, string> = {
  equals: '=',
  notEqual: '≠',
  smallerThan: '<',
  smallerThanOrEquals: '≤',
  greaterThan: '>',
  greaterThanOrEquals: '≥',
};

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

export const StringOperatorLabels: Record<StringOperatorType, string> = {
  equalsIgnoreCase: 'Equals',
  equals: 'Equals', // not available as dropdown option to user to avoid clutter
  notEqual: 'Not Equal',
  startsWithIgnoreCase: 'Starts With',
  startsWith: 'Starts With', // not available as dropdown option to user to avoid clutter
  notStartsWith: 'Not Starts With',
  contains: 'Contains',
  notContains: 'Not Contains',
};

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
  implements IBaseSearchCriteria<T>, ISerializable<SearchCriteria<T>, RootStore> {
  @observable public key: keyof T;
  @observable public valueType: 'number' | 'date' | 'string' | 'array';
  @observable public operator: OperatorType;

  private disposers: Lambda[] = [];

  constructor(
    key: keyof T,
    valueType: 'number' | 'date' | 'string' | 'array',
    operator: OperatorType,
  ) {
    this.key = key;
    this.valueType = valueType;
    this.operator = operator;
    makeObservable(this);
  }

  abstract getLabel(dict: SearchKeyDict<T>, rootStore: RootStore): string;
  abstract serialize(rootStore: RootStore): SearchCriteria<T>;

  static deserialize<T>(criteria: SearchCriteria<T>): ClientBaseCriteria<T> {
    const { valueType } = criteria;
    switch (valueType) {
      case 'number':
        const num = criteria as INumberSearchCriteria<T>;
        return new ClientNumberSearchCriteria(num.key, num.value, num.operator);
      case 'date':
        const dat = criteria as IDateSearchCriteria<T>;
        return new ClientDateSearchCriteria(dat.key, dat.value, dat.operator);
      case 'string':
        const str = criteria as IStringSearchCriteria<T>;
        return new ClientStringSearchCriteria(str.key, str.value, str.operator);
      case 'array':
        // Deserialize the array criteria: it's transformed from 1 ID into a list of IDs in serialize()
        // and untransformed here from a list of IDs to 1 ID
        const arr = criteria as ITagSearchCriteria<T>;
        const op =
          arr.value.length <= 1
            ? arr.operator
            : arr.operator === 'contains'
            ? 'containsRecursively'
            : arr.operator === 'notContains'
            ? 'containsNotRecursively'
            : arr.operator;
        const value = arr.value[0];
        return new ClientTagSearchCriteria(arr.key, value, op);
      default:
        throw new Error(`Unknown value type ${valueType}`);
    }
  }

  observe(callback: (criteria: ClientBaseCriteria<T>) => void): void {
    this.disposers.push(
      observe(this, 'key', () => callback(this)),
      observe(this, 'valueType', () => callback(this)),
      observe(this, 'operator', () => callback(this)),
      observe(this as typeof this & { value: unknown }, 'value', () => callback(this)),
    );
  }

  dispose(): void {
    for (const disposer of this.disposers) {
      disposer();
    }
  }
}

export class ClientTagSearchCriteria<T> extends ClientBaseCriteria<T> {
  @observable public value?: ID;

  constructor(key: keyof T, id?: ID, operator: TagOperatorType = 'containsRecursively') {
    super(key, 'array', operator);
    this.value = id;
    makeObservable(this);
  }

  /**
   * A flag for when the tag may be interpreted as a real tag, but contains text created by the application.
   * (this makes is so that "Untagged images" can be italicized)
   **/
  @action.bound isSystemTag = (): boolean => {
    return !this.value && !this.operator.toLowerCase().includes('not');
  };

  @action.bound getLabel: (dict: SearchKeyDict<T>, rootStore: RootStore) => string = (
    dict,
    rootStore,
  ) => {
    if (!this.value && !this.operator.toLowerCase().includes('not')) {
      return 'Untagged images';
    }
    return `${dict[this.key] || camelCaseToSpaced(this.key as string)} ${camelCaseToSpaced(
      this.operator,
    )} ${!this.value ? 'no tags' : rootStore.tagStore.get(this.value)?.name}`;
  };

  @action.bound
  serialize = (rootStore: RootStore): ITagSearchCriteria<T> => {
    // for the *recursive options, convert it to the corresponding non-recursive option,
    // by putting all child IDs in the value in the serialization step
    let op = this.operator as TagOperatorType;
    let val = this.value ? [this.value] : [];
    if (val.length > 0 && op.includes('Recursively')) {
      val =
        rootStore.tagStore
          .get(val[0])
          ?.getSubTreeList()
          ?.map((t) => t.id) || [];
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

  @action.bound setValue(value: ID): void {
    this.value = value;
  }
}

export class ClientStringSearchCriteria<T> extends ClientBaseCriteria<T> {
  @observable public value: string;

  constructor(key: keyof T, value: string = '', operator: StringOperatorType = 'contains') {
    super(key, 'string', operator);
    this.value = value;
    makeObservable(this);
  }

  @action.bound getLabel: (dict: SearchKeyDict<T>) => string = (dict) =>
    `${dict[this.key] || camelCaseToSpaced(this.key as string)} ${
      StringOperatorLabels[this.operator as StringOperatorType] || camelCaseToSpaced(this.operator)
    } "${this.value}"`;

  @action.bound serialize = (): IStringSearchCriteria<T> => {
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
  ) {
    super(key, 'number', operator);
    this.value = value;
    makeObservable(this);
  }
  @action.bound getLabel: () => string = () =>
    `${camelCaseToSpaced(this.key as string)} ${
      NumberOperatorSymbols[this.operator as NumberOperatorType] || camelCaseToSpaced(this.operator)
    } ${this.value}`;

  @action.bound serialize = (): INumberSearchCriteria<T> => {
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

  constructor(key: keyof T, value: Date = new Date(), operator: NumberOperatorType = 'equals') {
    super(key, 'date', operator);
    this.value = value;
    this.value.setHours(0, 0, 0, 0);
    makeObservable(this);
  }

  @action.bound getLabel: (dict: SearchKeyDict<T>) => string = (dict) =>
    `${dict[this.key] || camelCaseToSpaced(this.key as string)} ${
      NumberOperatorSymbols[this.operator as NumberOperatorType] || camelCaseToSpaced(this.operator)
    } ${this.value.toLocaleDateString()}`;

  @action.bound serialize = (): IDateSearchCriteria<T> => {
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
