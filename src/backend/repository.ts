import { IndexableType } from 'dexie';
import { ConditionDTO, OrderBy, OrderDirection } from 'src/api/data-storage-search';
import { ID } from 'src/api/id';

export interface IRepository<T> {
  get: (id: ID) => Promise<T | undefined>;
  getByIds: (ids: ID[]) => Promise<(T | undefined)[]>;
  getByKey: (key: keyof T, value: IndexableType) => Promise<T[]>;
  getAllOrdered: (order: OrderBy<T>, orderDirection: OrderDirection) => Promise<T[]>;
  find: (
    criteria: [ConditionDTO<T>, ...ConditionDTO<T>[]],
    order: OrderBy<T>,
    orderDirection: OrderDirection,
    matchAny?: boolean,
  ) => Promise<T[]>;
  findExact: (criteria: ConditionDTO<T>) => Promise<T[]>;
  count: () => Promise<number>;
  countExact: (criteria: ConditionDTO<T>) => Promise<number>;
  create: (item: T) => Promise<void>;
  createMany: (items: T[]) => Promise<void>;
  remove: (item: ID) => Promise<void>;
  removeMany: (items: ID[]) => Promise<void>;
  update: (item: T) => Promise<void>;
  updateMany: (items: T[]) => Promise<void>;
}
