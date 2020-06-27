import { IAction, CustomKeyDict } from '..';
import {
  StringOperatorType,
  ArrayOperatorType,
  BinaryOperatorType,
  NumberOperatorType,
  OperatorType,
  ClientStringSearchCriteria,
  ClientDateSearchCriteria,
  ClientNumberSearchCriteria,
  ClientCollectionSearchCriteria,
  ClientIDSearchCriteria,
} from 'src/renderer/entities/SearchCriteria';
import { ID, generateId } from 'src/renderer/entities/ID';
import { IMG_EXTENSIONS, IFile } from 'src/renderer/entities/File';
import { FileSearchCriteria } from 'src/renderer/frontend/stores/UiStore';

export type CriteriaKey = keyof Pick<
  IFile,
  'name' | 'absolutePath' | 'tags' | 'extension' | 'size' | 'dateAdded'
>;
export type CriteriaOperator = OperatorType;
export type TagValue =
  | { tagId: ID; label: string }
  | { collectionId: ID; label: string; tags: ID[] }
  | undefined;
export type CriteriaValue = string | number | Date | TagValue;

interface ICriteriaField<
  K extends CriteriaKey,
  O extends CriteriaOperator,
  V extends CriteriaValue
> {
  id: ID;
  key: K;
  operator: O;
  value: V;
}

export type CriteriaField =
  | ICriteriaField<'name' | 'absolutePath', StringOperatorType, string>
  | ICriteriaField<'tags', ArrayOperatorType, TagValue>
  | ICriteriaField<'extension', BinaryOperatorType, string>
  | ICriteriaField<'size', NumberOperatorType, number>
  | ICriteriaField<'dateAdded', NumberOperatorType, Date>;

const Default: { [key: string]: CriteriaField } = {
  name: { id: 'name', key: 'name', operator: 'contains', value: '' },
  absolutePath: { id: 'absolutePath', key: 'absolutePath', operator: 'contains', value: '' },
  tags: { id: 'tags', key: 'tags', operator: 'contains', value: undefined },
  extension: {
    id: 'extension',
    key: 'extension',
    operator: 'equals',
    value: IMG_EXTENSIONS[0],
  },
  size: { id: 'size', key: 'size', operator: 'greaterThanOrEquals', value: 0 },
  dateAdded: {
    id: 'dateAdded',
    key: 'dateAdded',
    operator: 'equals',
    value: new Date(),
  },
};

export function defaultState(): CriteriaField[] {
  return [{ ...Default['tags'] }];
}

const enum Flag {
  AddQuery,
  RemoveQuery,
  ResetSearch,
  Key,
  Operator,
  Value,
}

export type Action =
  | IAction<Flag.AddQuery | Flag.ResetSearch, undefined>
  | IAction<Flag.RemoveQuery, ID>
  | IAction<Flag.Key, { id: ID; value: CriteriaKey }>
  | IAction<Flag.Operator, { id: ID; value: CriteriaOperator }>
  | IAction<Flag.Value, { id: ID; value: CriteriaValue }>;

export const Factory = {
  addQuery: (): Action => ({
    flag: Flag.AddQuery,
    data: undefined,
  }),
  removeQuery: (data: ID): Action => ({
    flag: Flag.RemoveQuery,
    data,
  }),
  resetSearch: (): Action => ({
    flag: Flag.ResetSearch,
    data: undefined,
  }),
  setKey: (id: ID, value: CriteriaKey): Action => ({
    flag: Flag.Key,
    data: { id, value },
  }),
  setOperator: (id: ID, value: CriteriaOperator): Action => ({
    flag: Flag.Operator,
    data: { id, value },
  }),
  setValue: (id: ID, value: CriteriaValue): Action => ({
    flag: Flag.Value,
    data: { id, value },
  }),
  setTag: (id: ID, tagId: ID, label: string): Action => ({
    flag: Flag.Value,
    data: { id, value: { tagId, label } },
  }),
  setCollection: (id: ID, collectionId: ID, tags: ID[], label: string): Action => ({
    flag: Flag.Value,
    data: { id, value: { collectionId, tags, label } },
  }),
};

type State = { items: CriteriaField[] };

export function reducer(state: State, action: Action): State {
  switch (action.flag) {
    case Flag.AddQuery:
      state.items.push({ ...Default.tags, id: generateId() });
      return { ...state };

    case Flag.RemoveQuery: {
      const index = state.items.findIndex((i) => i.id === action.data);
      state.items.splice(index, 1);
      return { ...state };
    }
    case Flag.ResetSearch:
      return { items: [{ ...Default.tags, id: generateId() }] };

    case Flag.Key: {
      const index = state.items.findIndex((i) => i.id === action.data.id);
      const oldKey = state.items[index].key;
      // Keep the text value and operator when switching between name and path
      if ([oldKey, action.data.value].every((key) => ['name', 'absolutePath'].includes(key))) {
        state.items[index] = { ...state.items[index], id: action.data.id };
        state.items[index].key = action.data.value;
      } else {
        state.items[index] = { ...Default[action.data.value], id: action.data.id };
      }
      return { ...state };
    }

    case Flag.Operator: {
      const index = state.items.findIndex((i) => i.id === action.data.id);
      state.items[index].operator = action.data.value;
      return { ...state };
    }

    case Flag.Value: {
      const index = state.items.findIndex((i) => i.id === action.data.id);
      state.items[index].value = action.data.value;
      return { ...state };
    }

    default:
      return state;
  }
}

const BYTES_IN_MB = 1024 * 1024;

export function fromCriteria(criteria: FileSearchCriteria): CriteriaField {
  const c = { ...Default.tags, id: generateId() };
  if (
    criteria instanceof ClientStringSearchCriteria &&
    (criteria.key === 'name' || criteria.key === 'absolutePath' || criteria.key === 'extension')
  ) {
    c.value = criteria.value;
  } else if (criteria instanceof ClientDateSearchCriteria && criteria.key === 'dateAdded') {
    c.value = criteria.value;
  } else if (criteria instanceof ClientNumberSearchCriteria && criteria.key === 'size') {
    c.value = criteria.value / BYTES_IN_MB;
  } else if (
    criteria instanceof ClientIDSearchCriteria &&
    criteria.key === 'tags' &&
    criteria.value.length > 0
  ) {
    c.value = { tagId: criteria.value[0], label: criteria.label };
  } else if (criteria instanceof ClientCollectionSearchCriteria && criteria.key === 'tags') {
    c.value = { collectionId: criteria.collectionId, label: criteria.label, tags: criteria.value };
  } else {
    return c;
  }
  c.key = criteria.key;
  c.operator = criteria.operator;
  return c;
}

export function intoCriteria(field: CriteriaField): FileSearchCriteria {
  if (field.key === 'name' || field.key === 'absolutePath' || field.key === 'extension') {
    return new ClientStringSearchCriteria(field.key, field.value, field.operator, CustomKeyDict);
  } else if (field.key === 'dateAdded') {
    return new ClientDateSearchCriteria(field.key, field.value, field.operator, CustomKeyDict);
  } else if (field.key === 'size') {
    return new ClientNumberSearchCriteria(
      field.key,
      field.value * BYTES_IN_MB,
      field.operator,
      CustomKeyDict,
    );
  } else if (field.key === 'tags' && field.value) {
    if ('tagId' in field.value) {
      return new ClientIDSearchCriteria(
        field.key,
        field.value.tagId,
        field.value.label,
        field.operator,
        CustomKeyDict,
      );
    } else {
      return new ClientCollectionSearchCriteria(
        field.value.collectionId,
        field.value.tags,
        field.value.label,
        field.operator,
        CustomKeyDict,
      );
    }
  } else {
    return new ClientIDSearchCriteria('tags');
  }
}
