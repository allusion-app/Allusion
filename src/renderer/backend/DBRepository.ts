import { openDb } from 'idb';
import { ID, IIdentifiable } from '../entities/ID';
import { DB_VERSION } from './config';

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
  return openDb(dbName, DB_VERSION, (upgradeDB) => {
    collections.forEach(({ name, indices }) => {
      // Only add stores and indicies if they don't exist yet
      // Todo: A store might exist, but with different properties, so we should also check for those
      const objectStore = upgradeDB.objectStoreNames.contains(name)
        ? upgradeDB.transaction.objectStore(name)
        : upgradeDB.createObjectStore(name, { keyPath: 'id', autoIncrement: true });

      indices.forEach(({ name: idxName, path, opts }) => {
        if (!objectStore.indexNames.contains(idxName)) {
          objectStore.createIndex(idxName, path, opts);
        }
      });
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
    property: keyof T,
    query: any,
    count?: number,
    sortField?: keyof T,
    descending?: boolean,
  ): Promise<T[]> {
    // Todo: Search more efficiently
    // https://stackoverflow.com/questions/14146671/multiple-keys-query-in-indexeddb-similar-to-or-in-sql
    // https://stackoverflow.com/questions/30737219/indexeddb-search-multi-values-on-same-index

    const db = await openDb(dbName);
    const findSingle = (q: any) => db
      .transaction(this.collectionName)
      .objectStore<T, ID>(this.collectionName)
      .index(property as string)
      .getAll(q, count);

    if (!Array.isArray(query)) {
      return findSingle(query);
    }
    // If it's an array of queries, execute them individually
    const queryResults = await Promise.all(query.map((q) => findSingle(q)));

    // Combine the query results and remove duplicates
    const uniqueResMap = new Map<ID, T>();
    queryResults.flat()
      .forEach((val) => {
        if (!uniqueResMap.has(val.id)) {
          uniqueResMap.set(val.id, val);
        }
      },
    );

    // Todo: Take into account the sorting order
    return Array.from(uniqueResMap.values());
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
