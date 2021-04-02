import { generateId, ID } from 'src/entities/ID';
import { IFile, IMG_EXTENSIONS } from 'src/entities/File';
import {
  OperatorType,
  StringOperatorType,
  TagOperatorType,
  NumberOperatorType,
  BinaryOperatorType,
} from 'src/entities/SearchCriteria';
import { FileSearchCriteria } from 'src/frontend/stores/UiStore';
import {
  ClientStringSearchCriteria,
  ClientTagSearchCriteria,
  ClientDateSearchCriteria,
  ClientNumberSearchCriteria,
} from 'src/entities/SearchCriteria';
import { CustomKeyDict } from '../types';
import TagStore from 'src/frontend/stores/TagStore';

export type Query =
  | IQuery<'name' | 'absolutePath', StringOperatorType, string>
  | IQuery<'tags', TagOperatorType, TagValue>
  | IQuery<'extension', BinaryOperatorType, string>
  | IQuery<'size', NumberOperatorType, number>
  | IQuery<'dateAdded', NumberOperatorType, Date>;

interface IQuery<K extends QueryKey, O extends QueryOperator, V extends QueryValue> {
  key: K;
  operator: O;
  value: V;
}

export type QueryKey = keyof Pick<
  IFile,
  'name' | 'absolutePath' | 'tags' | 'extension' | 'size' | 'dateAdded'
>;
export type QueryOperator = OperatorType;
export type QueryValue = string | number | Date | TagValue;
export type TagValue = { id: ID; label: string } | undefined;

export function defaultQuery(key: QueryKey): Query {
  if (key === 'name' || key === 'absolutePath') {
    return { key, operator: 'contains', value: '' };
  } else if (key === 'tags') {
    return { key, operator: 'contains', value: undefined };
  } else if (key === 'extension') {
    return {
      key,
      operator: 'equals',
      value: IMG_EXTENSIONS[0],
    };
  } else if (key === 'size') {
    return { key, operator: 'greaterThanOrEquals', value: 0 };
  } else {
    return {
      key,
      operator: 'equals',
      value: new Date(),
    };
  }
}

const BYTES_IN_MB = 1024 * 1024;

export function fromCriteria(criteria: FileSearchCriteria): [ID, Query] {
  const query = defaultQuery('tags');
  if (
    criteria instanceof ClientStringSearchCriteria &&
    (criteria.key === 'name' || criteria.key === 'absolutePath' || criteria.key === 'extension')
  ) {
    query.value = criteria.value;
  } else if (criteria instanceof ClientDateSearchCriteria && criteria.key === 'dateAdded') {
    query.value = criteria.value;
  } else if (criteria instanceof ClientNumberSearchCriteria && criteria.key === 'size') {
    query.value = criteria.value / BYTES_IN_MB;
  } else if (
    criteria instanceof ClientTagSearchCriteria &&
    criteria.key === 'tags' &&
    criteria.value.length > 0
  ) {
    query.value = { id: criteria.value[0], label: criteria.label };
  } else {
    return [generateId(), query];
  }
  query.key = criteria.key;
  query.operator = criteria.operator;
  return [generateId(), query];
}

export function intoCriteria(query: Query, tagStore: TagStore): FileSearchCriteria {
  if (query.key === 'name' || query.key === 'absolutePath' || query.key === 'extension') {
    return new ClientStringSearchCriteria(query.key, query.value, query.operator, CustomKeyDict);
  } else if (query.key === 'dateAdded') {
    return new ClientDateSearchCriteria(query.key, query.value, query.operator, CustomKeyDict);
  } else if (query.key === 'size') {
    return new ClientNumberSearchCriteria(
      query.key,
      query.value * BYTES_IN_MB,
      query.operator,
      CustomKeyDict,
    );
  } else if (query.key === 'tags' && query.value !== undefined) {
    return new ClientTagSearchCriteria(
      tagStore,
      query.key,
      query.value.id,
      query.value.label,
      query.operator,
      CustomKeyDict,
    );
  } else {
    return new ClientTagSearchCriteria(tagStore, 'tags');
  }
}
