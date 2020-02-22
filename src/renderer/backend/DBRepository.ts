import Dexie from 'dexie';
import { ID, IIdentifiable } from '../entities/ID';
import {
  SearchCriteria, IArraySearchCriteria, IStringSearchCriteria,
  INumberSearchCriteria, IDateSearchCriteria, StringOperatorType, NumberOperatorType,
} from '../entities/SearchCriteria';

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

export type FileOrder = 'ASC' | 'DESC';

export interface IDbRequest<T> {
  count?: number;
  order?: keyof T;
  fileOrder?: FileOrder;
}

export interface IDbQueryRequest<T> extends IDbRequest<T> {
  criteria: SearchCriteria<T> | [SearchCriteria<T>];
  // matchAny: boolean;
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

  public async getAll({ count, order, fileOrder }: IDbRequest<T>): Promise<T[]> {
    let col = order ? this.collection.orderBy(order as string) : this.collection;
    if (fileOrder === 'DESC') {
      col = col.reverse();
    }
    return (count ? col.limit(count) : col).toArray();
  }

  public async find(req: IDbQueryRequest<T>): Promise<T[]> {
    const { count, order, fileOrder } = req;
    let table = await this._find(req);
    table = fileOrder === 'DESC' ? table.reverse() : table;
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

  private async _find({ criteria }: IDbQueryRequest<T>)
    : Promise<Dexie.Collection<T, string>> {

    // Searching with multiple 'wheres': https://stackoverflow.com/questions/35679590/dexiejs-indexeddb-chain-multiple-where-clauses
    // Unfortunately doesn't work out of the box.
    // It's one of the things they are working on, looks much better: https://github.com/dfahlander/Dexie.js/issues/427
    // But for now, separate first where from the rest...
    const [firstCrit, ...otherCrits] = Array.isArray(criteria) ? criteria : [criteria];

    const where = this.collection.where(firstCrit.key as string);

    // Now we have to map our criteria to something that Dexie understands
    let table = where.equals(firstCrit.value);
    switch (firstCrit.valueType) {
      case 'array':
        table = this._filterArrayInitial(where, firstCrit as IArraySearchCriteria<T>); break;
      case 'string':
        table = this._filterStringInitial(where, firstCrit as IStringSearchCriteria<T>); break;
      case 'number':
        table = this._filterNumberInitial(where, firstCrit as INumberSearchCriteria<T>); break;
      case 'date':
        table = this._filterDateInitial(where, firstCrit as IDateSearchCriteria<T>); break;
    }

    // const matchFuncName = matchAny ? 'or' : 'and';

    // Todo: OR can only be done in a like initial criteria, but that doesn't support all of our operators
    // Other option is to do a filter and check all criteria within the callback

    // Filter for the rest of the queries
    for (const crit of otherCrits as Array<SearchCriteria<T>>) {
      switch (crit.valueType) {
        case 'array':
          table = this._filterArray(table, crit as IArraySearchCriteria<T>); break;
        case 'string':
          table = this._filterString(table, crit as IStringSearchCriteria<T>); break;
        case 'number':
          table = this._filterNumber(table, crit as INumberSearchCriteria<T>); break;
        case 'date':
          table = this._filterDate(table, crit as IDateSearchCriteria<T>); break;
      }
    }

    return table;
  }

  ///////////////////////////////
  ////// FILTERING METHODS //////
  ///////////////////////////////
  // There are 'initial' and normal filter functions, since only the first criteria
  // can use the IndexedDB search functionality, the others need to be performed as filters

  private _filterArrayInitial(where: Dexie.WhereClause<T, string>, crit: IArraySearchCriteria<T>) {
    // Querying array props: https://dexie.org/docs/MultiEntry-Index
    // Check whether to search for empty arrays (e.g. no tags)
    if (crit.value.length === 0) {
      return crit.operator === 'contains'
        ? this.collection.filter((val: any) => val[crit.key as string].length === 0)
        : this.collection.filter((val: any) => val[crit.key as string].length !== 0);
    } else { // not contains
      const idsFuncName = crit.operator === 'contains' ? 'anyOf' : 'noneOf';
      return where[idsFuncName](crit.value).distinct();
    }
  }

  private _filterArray(col: Dexie.Collection<T, string>, crit: IArraySearchCriteria<T>) {
    if (crit.operator === 'contains') {
      // Check whether to search for empty arrays (e.g. no tags)
      return (crit.value.length === 0)
        ? col.and((val: any) => val[crit.key as string].length === 0)
        : col.and((val: any) => crit.value.some((item) => val[crit.key as string].indexOf(item) !== -1));
    } else { // not contains
      return (crit.value.length === 0)
        ? col.and((val: any) => val[crit.key as string].length !== 0)
        : col.and((val: any) => !crit.value.some((item) => val[crit.key as string].indexOf(item) !== -1));
    }
  }

  private _filterStringInitial(where: Dexie.WhereClause<T, string>, crit: IStringSearchCriteria<T>) {
    type DbStringOperator = 'equalsIgnoreCase' | 'startsWithIgnoreCase';
    const funcName = ((operator: StringOperatorType): DbStringOperator | undefined => {
      switch (operator) {
        case 'equals':     return 'equalsIgnoreCase';
        case 'startsWith': return 'startsWithIgnoreCase';
        default:           return undefined;
      }
    })(crit.operator);

    if (!funcName) {
      // Use normal string filter as fallback for functions not supported by the DB
      return this._filterString(undefined, crit);
    }
    return where[funcName](crit.value);
  }

  private _filterString(col: Dexie.Collection<T, string> | undefined, crit: IStringSearchCriteria<T>) {
    const { key, value } = crit as IStringSearchCriteria<T>;
    const valLow = value.toLowerCase();

    const getFilterFunc = (operator: StringOperatorType) => {
      switch (operator) {
        case 'equals':
          return (t: any) => (t[key] as string).toLowerCase() === valLow;
        case 'notEqual':
          return (t: any) => (t[key] as string).toLowerCase() !== valLow;
        case 'contains':
          return (t: any) => (t[key] as string).toLowerCase().indexOf(valLow) !== -1;
        case 'notContains':
          return (t: any) => (t[key] as string).toLowerCase().indexOf(valLow) === -1;
        case 'startsWith':
          return (t: any) => (t[key] as string).toLowerCase().startsWith(valLow);
        case 'notStartsWith':
          return (t: any) => !(t[key] as string).toLowerCase().startsWith(valLow);
        default:
          console.log('String operator not allowed:', operator);
          return () => false;
      }
    };

    const filterFunc = getFilterFunc(crit.operator);
    if (col) {
      return col.and(filterFunc);
    }
    return this.collection.filter(filterFunc);
  }

  private _filterNumberInitial(where: Dexie.WhereClause<T, string>, crit: INumberSearchCriteria<T>) {
    type DbNumberOperator = 'equals' | 'notEqual' | 'below' | 'belowOrEqual' | 'above' | 'aboveOrEqual';
    const funcName = ((operator: NumberOperatorType): DbNumberOperator | undefined => {
      switch (operator) {
        case 'equals':              return 'equals';
        case 'notEqual':            return 'notEqual';
        case 'smallerThan':         return 'below';
        case 'smallerThanOrEquals': return 'belowOrEqual';
        case 'greaterThan':         return 'above';
        case 'greaterThanOrEquals': return 'aboveOrEqual';
        default:                    return undefined;
      }
    })(crit.operator);

    if (!funcName) {
      console.log('Number operator not allowed:', crit.operator);
      return this.collection.filter(() => false);
    }
    return where[funcName](crit.value);
  }

  private _filterNumber(col: Dexie.Collection<T, string> | undefined, crit: INumberSearchCriteria<T>) {
    const { key, value } = crit;

    const getFilterFunc = (operator: NumberOperatorType) => {
      switch (operator) {
        case 'equals':              return (t: any) => t[key] === value;
        case 'notEqual':            return (t: any) => t[key] !== value;
        case 'smallerThan':         return (t: any) => t[key] < value;
        case 'smallerThanOrEquals': return (t: any) => t[key] <= value;
        case 'greaterThan':         return (t: any) => t[key] > value;
        case 'greaterThanOrEquals': return (t: any) => t[key] >= value;
        default:
          console.log('Number operator not allowed:', crit.operator);
          return () => false;
      }
    };

    const filterFunc = getFilterFunc(crit.operator);
    if (col) {
      return col.and(filterFunc);
    }
    return this.collection.filter(filterFunc);
  }

  private _filterDateInitial(where: Dexie.WhereClause<T, string>, crit: IDateSearchCriteria<T>) {
    const dateStart = new Date(crit.value);
    dateStart.setHours(0, 0, 0);
    const dateEnd = new Date(crit.value);
    dateEnd.setHours(23, 59, 59);

    const col = ((operator: NumberOperatorType): Dexie.Collection<T, string> | undefined => {
      switch (operator) {
        // equal to this day, so between 0:00 and 23:59
        case 'equals': return where.between(dateStart, dateEnd);
        case 'smallerThan':         return where.below(dateStart);
        case 'smallerThanOrEquals': return where.below(dateEnd);
        case 'greaterThan':         return where.above(dateEnd);
        case 'greaterThanOrEquals': return where.above(dateStart);
        default:                    return undefined;
      }
    })(crit.operator);

    if (!col) {
      // Use fallback
      return this._filterDate(undefined, crit);
    }
    return col;
  }

  private _filterDate(col: Dexie.Collection<T, string> | undefined, crit: IDateSearchCriteria<T>) {
    const { key } = crit;
    const start = new Date(crit.value);
    start.setHours(0, 0, 0);
    const end = new Date(crit.value);
    end.setHours(23, 59, 59);

    const getFilterFunc = (operator: NumberOperatorType) => {
      switch (operator) {
        case 'equals':              return (t: any) => t[key] >= start || t[key] <= end;
        case 'notEqual':            return (t: any) => t[key] < start || t[key] > end;
        case 'smallerThan':         return (t: any) => t[key] < start;
        case 'smallerThanOrEquals': return (t: any) => t[key] <= end;
        case 'greaterThan':         return (t: any) => t[key] > end;
        case 'greaterThanOrEquals': return (t: any) => t[key] >= start;
        default:
          console.log('Date operator not allowed:', crit.operator);
          return () => false;
      }
    };

    const filterFunc = getFilterFunc(crit.operator);
    if (col) {
      return col.and(filterFunc);
    }
    return this.collection.filter(filterFunc);
  }
}
