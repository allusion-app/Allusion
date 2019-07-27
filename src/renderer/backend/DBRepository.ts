import Dexie from 'dexie';
import { ID, IIdentifiable } from '../entities/ID';
import { SearchCriteria } from '../entities/SearchCriteria';

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

export const dbDelete = (dbName: string) => {
  Dexie.delete(dbName);
};

export interface IDbRequest<T> {
  count?: number;
  order?: keyof T;
  descending?: boolean;
}

export interface IDbQueryRequest<T> extends IDbRequest<T> {
  criteria: SearchCriteria<T> | [SearchCriteria<T>];
}

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

  public async find(req: IDbQueryRequest<T>): Promise<T[]> {
    const { count, order, descending } = req;
    let table = await this._find(req);
    table = descending ? table.reverse() : table;
    table = count ? table.limit(count) : table;
    return order ? table.sortBy(order as string) : table.toArray();
  }

  public async count(queryRequest?: IDbQueryRequest<T>): Promise<number> {
    if (!queryRequest) {
      return this.collection.count();
    }
    const table = await this._find(queryRequest);
    return table.count();
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
    await this.collection.put(item);
    return item;
  }

  public async updateMany(items: T[]): Promise<T[]> {
    await this.collection.bulkPut(items); // note: this will also create them if they don't exist
    return items;
  }

  private async _find({ criteria, count, order, descending }: IDbQueryRequest<T>)
    : Promise<Dexie.Collection<T, string>> {

    // Searching with multiple 'wheres': https://stackoverflow.com/questions/35679590/dexiejs-indexeddb-chain-multiple-where-clauses
    // Separate first where from the rest
    const [firstCrit, ...otherCrits] = Array.isArray(criteria) ? criteria : [criteria];

    const where = this.collection.where(firstCrit.key as string);

    // Querying array props: https://dexie.org/docs/MultiEntry-Index
    let table = where.equals(firstCrit.value);
    if (Array.isArray(firstCrit.value)) {
      table = (firstCrit.value.length === 0)
        ? this.collection.filter((val: any) => val[firstCrit.key as string].length === 0) // find where array is empty
        : where.anyOf(...firstCrit.value).distinct();
    } else {
      // Todo: Deal with other search criteria types
    }

    for (const crit of otherCrits as Array<SearchCriteria<T>>) {
      if ('equalitySign' in crit) {
        if (crit.equalitySign === 'equal') {
            // table = table.and((item) => item[crit.key] === crit.value);
        } else if (crit.equalitySign === 'greater') {

        } else if (crit.equalitySign === 'smaller') {

        }
      } else if ('exact' in crit) {

      }
      
      // Todo: Deal with other search criteria types
    }
    return table;
  }
}
