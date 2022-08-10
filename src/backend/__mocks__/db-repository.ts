import { shuffleArray } from 'common/core';
import { IndexableType } from 'dexie';
import { OrderBy, OrderDirection, ConditionDTO } from '../../api/data-storage-search';
import { ID } from '../../api/id';
import { IRepository } from '../repository';

export const dbInit = jest.fn();

interface IRecord {
  id: ID;
}

/**
 * An in-memory database implementation for testing purposes
 */
export default class InMemoryDbRepository<T extends IRecord> implements IRepository<T> {
  /** A dictionairy containing all database entries in memory */
  items: T[] = [];

  async get(id: ID): Promise<T | undefined> {
    return this.items.find((item) => item.id === id);
  }

  async getByIds(ids: string[]): Promise<(T | undefined)[]> {
    return ids.map((id) => this.items.find((item) => item.id === id));
  }

  async getByKey(key: keyof T, value: IndexableType): Promise<T[]> {
    return this.items.filter((item) => (item[key] as any) === value);
  }

  async getAll(): Promise<T[]> {
    return this.items.slice();
  }

  async getAllOrdered(order: OrderBy<T>, orderDirection: OrderDirection): Promise<T[]> {
    const items = this.items.slice();

    if (order === 'random') {
      return shuffleArray(items);
    } else {
      // TODO: Order by property
      return orderDirection === OrderDirection.Desc ? items.reverse() : items;
    }
  }

  async find(
    criterias: [ConditionDTO<T>, ...ConditionDTO<T>[]],
    order: OrderBy<T>,
    orderDirection: OrderDirection,
    matchAny?: boolean,
  ): Promise<T[]> {
    // TODO: Match using operators
    function isMatch(item: T, criteria: ConditionDTO<T>) {
      if (criteria.valueType === 'array') {
        return criteria.value.every((value) => (item[criteria.key] as any).includes(value));
      } else {
        return (item[criteria.key] as any) === criteria.value;
      }
    }

    const items = this.items.filter((item) => {
      if (matchAny) {
        return criterias.some((criteria) => isMatch(item, criteria));
      } else {
        return criterias.every((criteria) => isMatch(item, criteria));
      }
    });

    if (order === 'random') {
      return shuffleArray(items);
    } else {
      // TODO: Order by property
      return orderDirection === OrderDirection.Desc ? items.reverse() : items;
    }
  }

  async findExact(criteria: ConditionDTO<T>): Promise<T[]> {
    return this.items.filter((item) => {
      if (criteria.valueType === 'array') {
        return criteria.value.every((value) => (item[criteria.key] as any).includes(value));
      } else {
        return (item[criteria.key] as any) === criteria.value;
      }
    });
  }

  async count(): Promise<number> {
    return this.items.length;
  }

  async countExact(criteria: ConditionDTO<T>): Promise<number> {
    const items = await this.findExact(criteria);
    return items.length;
  }

  async create(item: T): Promise<void> {
    this.items.push(item);
  }

  async createMany(items: T[]): Promise<void> {
    this.items.push(...items);
  }

  async remove(id: ID): Promise<void> {
    const index = this.items.findIndex((item) => item.id === id);
    if (index > -1) {
      this.items.splice(index, 1);
    }
  }

  async removeMany(ids: ID[]): Promise<void> {
    for (const id of ids) {
      const index = this.items.findIndex((item) => item.id === id);
      if (index > -1) {
        this.items.splice(index, 1);
      }
    }
  }

  async update(updatedItem: T): Promise<void> {
    const index = this.items.findIndex((item) => item.id === updatedItem.id);
    if (index !== -1) {
      this.items[index] = updatedItem;
    }
  }

  async updateMany(updatedItems: T[]): Promise<void> {
    for (const updatedItem of updatedItems) {
      const index = this.items.findIndex((item) => item.id === updatedItem.id);
      if (index !== -1) {
        this.items[index] = updatedItem;
      }
    }
  }
}
