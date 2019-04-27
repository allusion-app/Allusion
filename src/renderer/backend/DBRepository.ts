import Dexie from 'dexie';
import { ID, IIdentifiable } from '../entities/ID';

export interface IDBCollectionConfig {
  name: string;
  schema: string;
}

export interface IDBVersioningConfig {
  version: number;
  collections: IDBCollectionConfig[];
  upgrade?: (tx: Dexie.Transaction) => void;
}

/**
 * A function that should be called before using the database.
 * It initializes the object stores
 */
export const dbInit = (configs: IDBVersioningConfig[], dbName: string) => {
  const db = new Dexie(dbName);

  // Initialize for each DB version: https://dexie.org/docs/Tutorial/Design#database-versioning
  configs.forEach(({ version, collections, upgrade }) => {
    const dbSchema: { [key: string]: string } = {};
    collections.forEach(({ name, schema }) => (dbSchema[name] = schema));
    const stores = db.version(version).stores(dbSchema);
    if (upgrade) {
      stores.upgrade(upgrade);
    }
  });

  return db;
};

export interface IDbRequest<T> {
  count?: number;
  order?: keyof T;
  descending?: boolean;
}

export interface IDbQueryRequest<T> extends IDbRequest<T> {
  queryField: keyof T;
  query: any;
}

const DEFAULT_COUNT = Number.MAX_SAFE_INTEGER;
const DEFAULT_ORDER = 'id';

/**
 * A class that manages data retrieval and updating with a database.
 * Extends Dexie: https://dexie.org/docs/Tutorial/Consuming-dexie-as-a-module
 */
export default class BaseRepository<T extends IIdentifiable> {
  db: Dexie;
  collectionName: string;
  collection: Dexie.Table<T, ID>;

  constructor(collectionName: string, db: Dexie) {
    this.db = db;
    this.collectionName = collectionName;
    this.collection = db.table(collectionName);
  }

  public async get(id: ID): Promise<T | undefined> {
    return this.collection.get(id);
  }

  public async getAll({ count, order, descending }: IDbRequest<T>): Promise<T[]> {
    let col = order ? this.collection.orderBy(order as string) : this.collection;
    if (descending) {
      col = col.reverse();
    }
    return (count ? col.limit(count) : col).toArray();
  }

  public async find({ queryField, query, count, order, descending }: IDbQueryRequest<T>): Promise<T[]> {
    const where = this.collection.where(queryField as string);
    let table;
    // Querying array props: https://dexie.org/docs/MultiEntry-Index
    table = Array.isArray(query) ? where.anyOf(query) : where.equals(query);
    if (descending) {
      table = table.reverse();
    }
    return table
      .limit(count || DEFAULT_COUNT)
      .sortBy(order as string || DEFAULT_ORDER);
  }

  public async count(): Promise<number> {
    return this.collection.count();
  }

  public async create(item: T): Promise<T> {
    await this.collection.put(item);
    return item;
  }

  public async createMany(items: T[]) {
    await this.collection.bulkAdd(items);
    return items;
  }

  public async remove(item: T): Promise<void> {
    return this.collection.delete(item.id);
  }

  public async removeMany(items: T[]): Promise<void> {
    return this.collection.bulkDelete(items.map((i) => i.id));
  }

  public async update(item: T): Promise<T> {
    await this.collection.update(item.id, item);
    return item;
  }

  public async updateMany(items: T[]): Promise<T[]> {
    await this.collection.bulkPut(items); // note: this will also create them if they don't exist
    return items;
  }

}
