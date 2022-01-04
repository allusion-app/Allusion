import Dexie, { Transaction, WhereClause } from 'dexie';

import { ID, IResource } from '../entities/ID';
import {
  SearchCriteria,
  ITagSearchCriteria,
  IStringSearchCriteria,
  INumberSearchCriteria,
  IDateSearchCriteria,
  StringOperatorType,
  NumberOperatorType,
} from '../entities/SearchCriteria';

export interface IDBCollectionConfig {
  name: string;
  schema: string;
}

export interface IDBVersioningConfig {
  version: number;
  collections: IDBCollectionConfig[];
  upgrade?: (tx: Transaction) => void | Promise<void>;
}

/**
 * A function that should be called before using the database.
 * It initializes the object stores
 */
export const dbInit = (configs: IDBVersioningConfig[], dbName: string): Dexie => {
  const db = new Dexie(dbName);

  // Initialize for each DB version: https://dexie.org/docs/Tutorial/Design#database-versioning
  for (const config of configs) {
    const { version, collections, upgrade } = config;
    const dbSchema: { [key: string]: string } = {};
    collections.forEach(({ name, schema }) => (dbSchema[name] = schema));
    const stores = db.version(version).stores(dbSchema);
    if (upgrade) {
      stores.upgrade(upgrade);
    }
  }

  return db;
};

export const dbDelete = (dbName: string): void => {
  Dexie.delete(dbName);
};

export const enum FileOrder {
  Asc,
  Desc,
}

export interface IDbRequest<T> {
  count?: number;
  order?: keyof T;
  fileOrder?: FileOrder;
}

export interface IDbQueryRequest<T> extends IDbRequest<T> {
  criteria: SearchCriteria<T> | [SearchCriteria<T>];
  matchAny?: boolean;
}

export type SearchConjunction = 'and' | 'or';

/**
 * A class that manages data retrieval and updating with a database.
 * Extends Dexie: https://dexie.org/docs/Tutorial/Consuming-dexie-as-a-module
 */
export default class BaseRepository<T extends IResource> {
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

  public async getByIds(ids: ID[]): Promise<(T | undefined)[]> {
    return this.collection.bulkGet(ids);
  }

  public async getByKey(key: keyof T, value: any): Promise<T[]> {
    return this.collection
      .where(key as string)
      .equals(value)
      .toArray();
  }

  public async getAll({ count, order, fileOrder }: IDbRequest<T>): Promise<T[]> {
    const col = order ? this.collection.orderBy(order as string) : this.collection;
    const res = await (count ? col.limit(count) : col).toArray();
    return fileOrder === FileOrder.Desc ? res.reverse() : res;
  }

  public async find(req: IDbQueryRequest<T>): Promise<T[]> {
    const { order, fileOrder } = req;
    let table = await this._find(req, req.matchAny ? 'or' : 'and');
    table = fileOrder === FileOrder.Desc ? table.reverse() : table;

    // table.reverse() can be an order of magnitude slower as a javascript .reverse() call at the end
    // (tested at ~5000 items, 500ms instead of 100ms)
    // easy to verify here https://jsfiddle.net/dfahlander/xf2zrL4p

    const res = await (order ? table.sortBy(order as string) : table.toArray());
    return order === FileOrder.Desc ? res.reverse() : res;

    // Slower alternative
    // table = count ? table.limit(count) : table;
    // return order ? table.sortBy(order as string) : table.toArray();
  }

  public async count(queryRequest?: IDbQueryRequest<T>): Promise<number> {
    if (!queryRequest) {
      return this.collection.count();
    }
    const table = await this._find(queryRequest, queryRequest.matchAny ? 'or' : 'and');
    return table.count();
  }

  public async create(item: T): Promise<T> {
    await this.collection.put(item);
    return item;
  }

  public async createMany(items: T[]): Promise<T[]> {
    await this.collection.bulkAdd(items);
    return items;
  }

  public async remove(item: ID): Promise<void> {
    return this.collection.delete(item);
  }

  public async removeMany(items: ID[]): Promise<void> {
    return this.collection.bulkDelete(items);
  }

  public async update(item: T): Promise<T> {
    await this.collection.put(item);
    return item;
  }

  public async updateMany(items: T[]): Promise<T[]> {
    await this.collection.bulkPut(items); // note: this will also create them if they don't exist
    return items;
  }

  private async _find(
    { criteria }: IDbQueryRequest<T>,
    conjunction: SearchConjunction = 'and',
  ): Promise<Dexie.Collection<T, string>> {
    // Searching with multiple 'wheres': https://stackoverflow.com/questions/35679590/dexiejs-indexeddb-chain-multiple-where-clauses
    // Unfortunately doesn't work out of the box.
    // It's one of the things they are working on, looks much better: https://github.com/dfahlander/Dexie.js/issues/427
    // We'll have to mostly rely on naive filter function (lambdas)

    const criteriaList = Array.isArray(criteria) ? criteria : [criteria];
    if (criteriaList.length > 1 && conjunction === 'or') {
      // OR: We can only chain ORs if all filters can be "where" functions - else we do an ugly .some() check on every document

      let allWheres = true;
      let table: Dexie.Collection<T, string> | undefined = undefined;
      for (const crit of criteriaList) {
        const where = !table
          ? this.collection.where(crit.key as string)
          : table.or(crit.key as string);
        const tableOrFilter = this._filterWhere(where, crit);

        if (typeof tableOrFilter === 'function') {
          allWheres = false;
          break;
        } else {
          table = tableOrFilter;
        }
      }

      if (allWheres && table) {
        return table;
      } else {
        const critLambdas = criteriaList.map((crit) => this._filterLambda(crit));
        return this.collection.filter((t) => critLambdas.some((lambda) => lambda(t)));
      }
    }

    // AND: We can get some efficiency for ANDS by separating the first crit from the rest...
    // Dexie can use a fast "where" search for the initial search
    // For consecutive "and" conjunctions, a lambda function must be used
    // Since not all operators we need are supported by "where" filters, _filterWhere can also return a lambda.
    const [firstCrit, ...otherCrits] = criteriaList;

    const where = this.collection.where(firstCrit.key as string);
    const whereOrFilter = this._filterWhere(where, firstCrit);
    let table =
      typeof whereOrFilter !== 'function' ? whereOrFilter : this.collection.filter(whereOrFilter);

    // Then just chain a loop of and() calls. A .every() feels more efficient than chaining table.and() calls
    if (otherCrits.length) {
      table = table.and((item) => otherCrits.every((crit) => this._filterLambda(crit)(item)));
    }
    // for (const crit of otherCrits) {
    //   table = table.and(this._filterLambda(crit));
    // }
    return table;
  }

  ///////////////////////////////
  ////// FILTERING METHODS //////
  ///////////////////////////////
  // There are 'where' and 'lambda filter functions:
  // - where: For filtering by a single criteria and for 'or' conjunctions, Dexie exposes indexeddb-accelerated functions.
  //          Since some of our search operations are not supported by Dexie, some _where functions return a lambda.
  // - lambda: For 'and' conjunctions, a naive filter function (lambda) must be used.

  private _filterWhere(where: WhereClause<T, string>, crit: SearchCriteria<T>) {
    switch (crit.valueType) {
      case 'array':
        return this._filterArrayWhere(where, crit as ITagSearchCriteria<T>);
      case 'string':
        return this._filterStringWhere(where, crit as IStringSearchCriteria<T>);
      case 'number':
        return this._filterNumberWhere(where, crit as INumberSearchCriteria<T>);
      case 'date':
        return this._filterDateWhere(where, crit as IDateSearchCriteria<T>);
    }
  }

  private _filterLambda(crit: SearchCriteria<T>) {
    switch (crit.valueType) {
      case 'array':
        return this._filterArrayLambda(crit as ITagSearchCriteria<T>);
      case 'string':
        return this._filterStringLambda(crit as IStringSearchCriteria<T>);
      case 'number':
        return this._filterNumberLambda(crit as INumberSearchCriteria<T>);
      case 'date':
        return this._filterDateLambda(crit as IDateSearchCriteria<T>);
    }
  }

  private _filterArrayWhere(where: WhereClause<T, string>, crit: ITagSearchCriteria<T>) {
    // Querying array props: https://dexie.org/docs/MultiEntry-Index
    // Check whether to search for empty arrays (e.g. no tags)
    if (crit.value.length === 0) {
      return crit.operator === 'contains'
        ? (val: T): boolean => (val as any)[crit.key as string].length === 0
        : (val: T): boolean => (val as any)[crit.key as string].length !== 0;
    } else {
      // contains/notContains 1 or more elements
      if (crit.operator === 'contains') {
        return where.anyOf(crit.value).distinct();
      } else {
        // not contains: there as a noneOf() function we used to use, but it matches every item individually, e.g.
        // an item with tags "Apple, Pear" is matched twice: once as Apple, once as Pear; A "notContains Apple" still matches for Pear
        return (val: T): boolean =>
          (val as any)[crit.key as string].every((val: string) => !crit.value.includes(val));
      }
    }
  }

  private _filterArrayLambda(crit: ITagSearchCriteria<T>) {
    if (crit.operator === 'contains') {
      // Check whether to search for empty arrays (e.g. no tags)
      return crit.value.length === 0
        ? (val: T): boolean => (val as any)[crit.key as string].length === 0
        : (val: T): boolean =>
            crit.value.some((item) => (val as any)[crit.key as string].indexOf(item) !== -1);
    } else {
      // not contains
      return crit.value.length === 0
        ? (val: T): boolean => (val as any)[crit.key as string].length !== 0
        : (val: T): boolean =>
            crit.value.every((item) => (val as any)[crit.key as string].indexOf(item) === -1);
    }
  }

  private _filterStringWhere(where: WhereClause<T, string>, crit: IStringSearchCriteria<T>) {
    const dbStringOperators = [
      'equalsIgnoreCase',
      'equals',
      'notEqual',
      'startsWithIgnoreCase',
      'startsWith',
    ] as const;

    if ((dbStringOperators as readonly string[]).includes(crit.operator)) {
      const funcName = (crit.operator as unknown) as typeof dbStringOperators[number];
      return where[funcName](crit.value);
    }
    // Use normal string filter as fallback for functions not supported by the DB
    return this._filterStringLambda(crit);
  }

  private _filterStringLambda(crit: IStringSearchCriteria<T>) {
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

    return getFilterFunc(crit.operator);
  }

  private _filterNumberWhere(where: WhereClause<T, string>, crit: INumberSearchCriteria<T>) {
    type DbNumberOperator =
      | 'equals'
      | 'notEqual'
      | 'below'
      | 'belowOrEqual'
      | 'above'
      | 'aboveOrEqual';
    const funcName = ((operator: NumberOperatorType): DbNumberOperator | undefined => {
      switch (operator) {
        case 'equals':
          return 'equals';
        case 'notEqual':
          return 'notEqual';
        case 'smallerThan':
          return 'below';
        case 'smallerThanOrEquals':
          return 'belowOrEqual';
        case 'greaterThan':
          return 'above';
        case 'greaterThanOrEquals':
          return 'aboveOrEqual';
        default:
          return undefined;
      }
    })(crit.operator);

    if (!funcName) {
      console.log('Number operator not allowed:', crit.operator);
      return this.collection.filter(() => false);
    }
    return where[funcName](crit.value);
  }

  private _filterNumberLambda(crit: INumberSearchCriteria<T>) {
    const { key, value } = crit;

    const getFilterFunc = (operator: NumberOperatorType) => {
      switch (operator) {
        case 'equals':
          return (t: any) => t[key] === value;
        case 'notEqual':
          return (t: any) => t[key] !== value;
        case 'smallerThan':
          return (t: any) => t[key] < value;
        case 'smallerThanOrEquals':
          return (t: any) => t[key] <= value;
        case 'greaterThan':
          return (t: any) => t[key] > value;
        case 'greaterThanOrEquals':
          return (t: any) => t[key] >= value;
        default:
          console.log('Number operator not allowed:', crit.operator);
          return () => false;
      }
    };

    return getFilterFunc(crit.operator);
  }

  private _filterDateWhere(where: WhereClause<T, string>, crit: IDateSearchCriteria<T>) {
    const dateStart = new Date(crit.value);
    dateStart.setHours(0, 0, 0);
    const dateEnd = new Date(crit.value);
    dateEnd.setHours(23, 59, 59);

    const col = ((operator: NumberOperatorType): Dexie.Collection<T, string> | undefined => {
      switch (operator) {
        // equal to this day, so between 0:00 and 23:59
        case 'equals':
          return where.between(dateStart, dateEnd);
        case 'smallerThan':
          return where.below(dateStart);
        case 'smallerThanOrEquals':
          return where.below(dateEnd);
        case 'greaterThan':
          return where.above(dateEnd);
        case 'greaterThanOrEquals':
          return where.above(dateStart);
        default:
          return undefined;
      }
    })(crit.operator);

    if (!col) {
      // Use fallback
      return this._filterDateLambda(crit);
    }
    return col;
  }

  private _filterDateLambda(crit: IDateSearchCriteria<T>) {
    const { key } = crit;
    const start = new Date(crit.value);
    start.setHours(0, 0, 0);
    const end = new Date(crit.value);
    end.setHours(23, 59, 59);

    const getFilterFunc = (operator: NumberOperatorType) => {
      switch (operator) {
        case 'equals':
          return (t: any) => t[key] >= start || t[key] <= end;
        case 'notEqual':
          return (t: any) => t[key] < start || t[key] > end;
        case 'smallerThan':
          return (t: any) => t[key] < start;
        case 'smallerThanOrEquals':
          return (t: any) => t[key] <= end;
        case 'greaterThan':
          return (t: any) => t[key] > end;
        case 'greaterThanOrEquals':
          return (t: any) => t[key] >= start;
        default:
          console.log('Date operator not allowed:', crit.operator);
          return () => false;
      }
    };

    return getFilterFunc(crit.operator);
  }
}
