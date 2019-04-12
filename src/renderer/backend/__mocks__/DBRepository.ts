import { IIdentifiable, ID } from '../../entities/ID';

export const dbInit = jest.fn();

/**
 * A Database implementation for testing purposes
 */
export default class InMemoryDbRepository<T extends IIdentifiable> {
  /** A dictionairy containing all database entries in memory */
  items: T[] = [];

  async get(id: ID) {
    return this.items.find((obj) => obj.id === id) as T;
  }

  async getAll(count?: number) {
    return this.items
      .slice(0, count);
  }

  async find(property: keyof T, query: any, count?: number) {
    return this.items
      .filter((obj) => Array.isArray(obj[property])
        ? (obj[property] as any).includes(query)
        : obj[property] === query)
      .slice(0, count);
  }

  async count(property?: string, query?: any): Promise<number> {
    return this.items.length;
  }

  async create(item: T) {
    this.items.push(item);
    return item;
  }

  async remove(item: T) {
    if (this.items.includes(item)) {
      this.items.splice(this.items.indexOf(item), 1);
    }
  }

  async update(item: T) {
    const index = this.items.indexOf(item);
    if (index !== -1) {
      this.items[index] = item;
    }
    return item;
  }
}
