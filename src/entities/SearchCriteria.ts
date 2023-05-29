import { action, Lambda, makeObservable, observable } from 'mobx';

import { camelCaseToSpaced } from '../../common/fmt';
import {
  ArrayConditionDTO,
  ConditionDTO,
  DateConditionDTO,
  NumberConditionDTO,
  NumberOperatorType,
  StringConditionDTO,
  StringOperatorType,
} from '../api/data-storage-search';
import { FileDTO } from '../api/file';
import { ID } from '../api/id';
import {
  IBaseSearchCriteria,
  IDateSearchCriteria,
  INumberSearchCriteria,
  IStringSearchCriteria,
  ITagSearchCriteria,
  OperatorType,
  SearchCriteria,
  TagOperatorType,
} from '../api/search-criteria';
import RootStore from '../frontend/stores/RootStore';

// A dictionary of labels for (some of) the keys of the type we search for
export type SearchKeyDict = Partial<Record<keyof FileDTO, string>>;

export const CustomKeyDict: SearchKeyDict = {
  absolutePath: 'Path',
  locationId: 'Location',
};

export const NumberOperatorSymbols: Record<NumberOperatorType, string> = {
  equals: '=',
  notEqual: '≠',
  smallerThan: '<',
  smallerThanOrEquals: '≤',
  greaterThan: '>',
  greaterThanOrEquals: '≥',
};

export const StringOperatorLabels: Record<StringOperatorType, string> = {
  equals: 'Equals',
  equalsIgnoreCase: 'Equals (case insensitive)',
  notEqual: 'Not Equal',
  startsWith: 'Starts With',
  startsWithIgnoreCase: 'Starts With (case insensitive)',
  notStartsWith: 'Not Starts With',
  contains: 'Contains',
  notContains: 'Not Contains',
};

export abstract class ClientFileSearchCriteria implements IBaseSearchCriteria {
  @observable public key: keyof FileDTO;
  @observable public valueType: 'number' | 'date' | 'string' | 'array';
  @observable public operator: OperatorType;

  private disposers: Lambda[] = [];

  constructor(
    key: keyof FileDTO,
    valueType: 'number' | 'date' | 'string' | 'array',
    operator: OperatorType,
  ) {
    this.key = key;
    this.valueType = valueType;
    this.operator = operator;
    makeObservable(this);
  }

  abstract getLabel(dict: SearchKeyDict, rootStore: RootStore): string;
  abstract serialize(rootStore: RootStore): SearchCriteria;
  abstract toCondition(rootStore: RootStore): ConditionDTO<FileDTO>;

  static deserialize(criteria: SearchCriteria): ClientFileSearchCriteria {
    const { valueType } = criteria;
    switch (valueType) {
      case 'number':
        const num = criteria as INumberSearchCriteria;
        return new ClientNumberSearchCriteria(num.key, num.value, num.operator);
      case 'date':
        const dat = criteria as IDateSearchCriteria;
        return new ClientDateSearchCriteria(dat.key, dat.value, dat.operator);
      case 'string':
        const str = criteria as IStringSearchCriteria;
        return new ClientStringSearchCriteria(str.key, str.value, str.operator);
      case 'array':
        // Deserialize the array criteria: it's transformed from 1 ID into a list of IDs in serialize()
        // and untransformed here from a list of IDs to 1 ID
        const arr = criteria as ITagSearchCriteria;
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

  dispose(): void {
    for (const disposer of this.disposers) {
      disposer();
    }
  }
}

export class ClientTagSearchCriteria extends ClientFileSearchCriteria {
  @observable public value?: ID;

  constructor(key: keyof FileDTO, id?: ID, operator: TagOperatorType = 'containsRecursively') {
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

  @action.bound getLabel: (dict: SearchKeyDict, rootStore: RootStore) => string = (
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

  serialize = (rootStore: RootStore): ITagSearchCriteria => {
    // for the *recursive options, convert it to the corresponding non-recursive option,
    // by putting all child IDs in the value in the serialization step
    let op = this.operator as TagOperatorType;
    let val = this.value ? [this.value] : [];
    if (val.length > 0 && op.includes('Recursively')) {
      const tag = rootStore.tagStore.get(val[0]);
      val = tag !== undefined ? Array.from(tag.getSubTree(), (t) => t.id) : [];
    }
    if (op === 'containsNotRecursively') {
      op = 'notContains';
    }
    if (op === 'containsRecursively') {
      op = 'contains';
    }

    return {
      key: this.key,
      valueType: this.valueType,
      operator: op,
      value: val,
    };
  };

  toCondition = (rootStore: RootStore): ArrayConditionDTO<FileDTO, any> => {
    return this.serialize(rootStore) as ArrayConditionDTO<FileDTO, any>;
  };

  @action.bound setOperator(op: TagOperatorType): void {
    this.operator = op;
  }

  @action.bound setValue(value: ID): void {
    this.value = value;
  }
}

export class ClientStringSearchCriteria extends ClientFileSearchCriteria {
  @observable public value: string;

  constructor(key: keyof FileDTO, value: string = '', operator: StringOperatorType = 'contains') {
    super(key, 'string', operator);
    this.value = value;
    makeObservable(this);
  }

  @action.bound getLabel: (dict: SearchKeyDict) => string = (dict) =>
    `${dict[this.key] || camelCaseToSpaced(this.key as string)} ${
      StringOperatorLabels[this.operator as StringOperatorType] || camelCaseToSpaced(this.operator)
    } "${this.value}"`;

  serialize = (): IStringSearchCriteria => {
    return {
      key: this.key,
      valueType: this.valueType,
      operator: this.operator as StringOperatorType,
      value: this.value,
    };
  };

  toCondition = (): StringConditionDTO<FileDTO> => {
    return this.serialize() as StringConditionDTO<FileDTO>;
  };

  @action.bound setOperator(op: StringOperatorType): void {
    this.operator = op;
  }

  @action.bound setValue(str: string): void {
    this.value = str;
  }
}

export class ClientNumberSearchCriteria extends ClientFileSearchCriteria {
  @observable public value: number;

  constructor(
    key: keyof FileDTO,
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

  serialize = (): INumberSearchCriteria => {
    return {
      key: this.key,
      valueType: this.valueType,
      operator: this.operator as NumberOperatorType,
      value: this.value,
    };
  };

  toCondition = (): NumberConditionDTO<FileDTO> => {
    return this.serialize() as NumberConditionDTO<FileDTO>;
  };

  @action.bound setOperator(op: NumberOperatorType): void {
    this.operator = op;
  }

  @action.bound setValue(num: number): void {
    this.value = num;
  }
}

export class ClientDateSearchCriteria extends ClientFileSearchCriteria {
  @observable public value: Date;

  constructor(
    key: keyof FileDTO,
    value: Date = new Date(),
    operator: NumberOperatorType = 'equals',
  ) {
    super(key, 'date', operator);
    this.value = value;
    this.value.setHours(0, 0, 0, 0);
    makeObservable(this);
  }

  @action.bound getLabel: (dict: SearchKeyDict) => string = (dict) =>
    `${dict[this.key] || camelCaseToSpaced(this.key as string)} ${
      NumberOperatorSymbols[this.operator as NumberOperatorType] || camelCaseToSpaced(this.operator)
    } ${this.value.toLocaleDateString()}`;

  serialize = (): IDateSearchCriteria => {
    return {
      key: this.key,
      valueType: this.valueType,
      operator: this.operator as NumberOperatorType,
      value: this.value,
    };
  };

  toCondition = (): DateConditionDTO<FileDTO> => {
    return this.serialize() as DateConditionDTO<FileDTO>;
  };

  @action.bound setOperator(op: NumberOperatorType): void {
    this.operator = op;
  }

  @action.bound setValue(date: Date): void {
    this.value = date;
  }
}
