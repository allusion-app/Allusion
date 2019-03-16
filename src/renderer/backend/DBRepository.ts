import { openDb } from 'idb';
import { ID, IIdentifiable } from '../entities/ID';

export const dbName = 'VisLib';

export interface IDBCollectionConfig {
  name: string;
  indices: Array<{ name: string; path: string; opts?: IDBIndexParameters }>;
}

/**
 * A function that should be called before using the database.
 * It initializes the object stores
 */
export const dbInit = (collections: IDBCollectionConfig[]) => {
  return openDb(dbName, 1, (upgradeDB) => {
    collections.forEach(({ name, indices }) => {
      const objectStore = upgradeDB.createObjectStore(name, {
        keyPath: 'id',
        autoIncrement: true,
      });
      indices.forEach(({ name: idxName, path, opts }) =>
        objectStore.createIndex(idxName, path, opts),
      );
    });
  });
};

/**
 * A class that manages data retrieval and updating with a database.
 * Old blogpost on how to use tags in IDB:
 * https://www.raymondcamden.com/2012/08/10/Searching-for-array-elements-in-IndexedDB
 */
export default class BaseRepository<T extends IIdentifiable> {
  public collectionName: string;

  constructor(collectionName: string) {
    this.collectionName = collectionName;
  }

  public async get(id: ID): Promise<T> {
    const db = await openDb(dbName);
    return db
      .transaction(this.collectionName)
      .objectStore<T, ID>(this.collectionName)
      .get(id);
  }

  public async getAll(count?: number): Promise<T[]> {
    const db = await openDb(dbName);
    return db
      .transaction(this.collectionName)
      .objectStore<T, ID>(this.collectionName)
      .getAll(undefined, count);
  }

  public async find(
    property: string,
    query: any,
    count?: number,
  ): Promise<T[]> {
    const db = await openDb(dbName);
    return db
      .transaction(this.collectionName)
      .objectStore<T, ID>(this.collectionName)
      .index(property)
      .getAll(query, count);
  }

  public async count(property?: string, query?: any): Promise<number> {
    const db = await openDb(dbName);
    return db
      .transaction(this.collectionName)
      .objectStore<T, ID>(this.collectionName)
      // .index(property)
      .count(query);
  }

  public async create(item: T): Promise<T> {
    const db = await openDb(dbName);
    const key = await db
      .transaction(this.collectionName, 'readwrite')
      .objectStore<T, ID>(this.collectionName)
      .add(item);
    const resItem = item;
    resItem.id = key as ID;
    return resItem;
  }

  public async remove(item: T): Promise<void> {
    const db = await openDb(dbName);
    return db
      .transaction(this.collectionName, 'readwrite')
      .objectStore<T, ID>(this.collectionName)
      .delete(item.id);
  }

  public async update(item: T): Promise<T> {
    const db = await openDb(dbName);
    await db
      .transaction(this.collectionName, 'readwrite')
      .objectStore<T, ID>(this.collectionName)
      .put(item);
    return item;
  }
}
