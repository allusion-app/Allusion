import { IResource, ID } from '../../entities/ID';

export const dbInit = jest.fn();

/**
 * A Database implementation for testing purposes
 */
export default class InMemoryDbRepository<T extends IResource> {
  /** A dictionairy containing all database entries in memory */
  items: T[] = [];

  async get(id: ID) {
    return this.items.find((obj) => obj.id === id) as T;
  }

  async getAll({ count }: any) {
    return this.items.slice(0, count);
  }

  async find({ queryField, query, count }: any) {
    return this.items
      .filter((obj: any) =>
        queryField in obj && Array.isArray(obj[queryField])
          ? (obj[queryField] as any).includes(query)
          : obj[queryField] === query,
      )
      .slice(0, count);
  }

  async count(): Promise<number> {
    return this.items.length;
  }

  async create(item: T) {
    this.items.push(item);
    return item;
  }

  async createMany(items: T[]) {
    this.items.push(...items);
    return items;
  }

  async remove(item: T) {
    if (this.items.includes(item)) {
      this.items.splice(this.items.indexOf(item), 1);
    }
  }

  async removeMany(items: T[]) {
    items.forEach((item) => {
      if (this.items.includes(item)) {
        this.items.splice(this.items.indexOf(item), 1);
      }
    });
  }

  async update(item: T) {
    const index = this.items.indexOf(item);
    if (index !== -1) {
      this.items[index] = item;
    }
    return item;
  }
  async updateMany(items: T[]) {
    items.forEach((item) => {
      const index = this.items.indexOf(item);
      if (index !== -1) {
        this.items[index] = item;
      }
    });
    return items;
  }
}
