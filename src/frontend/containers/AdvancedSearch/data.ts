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
  CustomKeyDict,
  ClientStringSearchCriteria,
  ClientTagSearchCriteria,
  ClientDateSearchCriteria,
  ClientNumberSearchCriteria,
} from 'src/entities/SearchCriteria';
import TagStore from 'src/frontend/stores/TagStore';

export type Criteria =
  | Field<'name' | 'absolutePath', StringOperatorType, string>
  | Field<'tags', TagOperatorType, TagValue>
  | Field<'extension', BinaryOperatorType, string>
  | Field<'size', NumberOperatorType, number>
  | Field<'dateAdded', NumberOperatorType, Date>;

interface Field<K extends Key, O extends Operator, V extends Value> {
  key: K;
  operator: O;
  value: V;
}

export type Key = keyof Pick<
  IFile,
  'name' | 'absolutePath' | 'tags' | 'extension' | 'size' | 'dateAdded'
>;
export type Operator = OperatorType;
export type Value = string | number | Date | TagValue;
export type TagValue = { id?: ID; label: string } | undefined;

export function defaultQuery(key: Key): Criteria {
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

export function fromCriteria(criteria: FileSearchCriteria): [ID, Criteria] {
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
  } else if (criteria instanceof ClientTagSearchCriteria && criteria.key === 'tags') {
    const id = criteria.value.length > 0 ? criteria.value[0] : undefined;
    query.value = { id, label: criteria.label };
  } else {
    return [generateId(), query];
  }
  query.key = criteria.key;
  query.operator = criteria.operator;
  return [generateId(), query];
}

export function intoCriteria(query: Criteria, tagStore: TagStore): FileSearchCriteria {
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
