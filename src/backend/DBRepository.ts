import Dexie, { IndexableType, Transaction, WhereClause } from 'dexie';
import { shuffleArray } from 'common/core';

import {
  DBSearchCriteria,
  DBArraySearchCriteria,
  DBStringSearchCriteria,
  DBNumberSearchCriteria,
  DBDateSearchCriteria,
} from './DBSearchCriteria';

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

export const enum OrderDirection {
  Asc,
  Desc,
}

type Key<T> = keyof T extends string ? keyof T : never;

export type SearchOrder<T> = Key<T> | 'random';

export type SearchConjunction = 'and' | 'or';

export type SearchCriterias<T> = [DBSearchCriteria<T, any>, ...DBSearchCriteria<T, any>[]];

/**
 * A class that manages data retrieval and updating with a database.
 * Extends Dexie: https://dexie.org/docs/Tutorial/Consuming-dexie-as-a-module
 */
export default class Repository<K extends string, V> {
  private collection: Dexie.Table<V, K>;

  constructor(collectionName: string, db: Dexie) {
    this.collection = db.table(collectionName);
  }

  public async get(id: K): Promise<V | undefined> {
    return this.collection.get(id);
  }

  public async getByIds(ids: K[]): Promise<(V | undefined)[]> {
    return this.collection.bulkGet(ids);
  }

  public async getByKey(key: Key<V>, value: IndexableType): Promise<V[]> {
    return this.collection.where(key).equals(value).toArray();
  }

  public async getAll(order?: SearchOrder<V>, orderDirection?: OrderDirection): Promise<V[]> {
    const col = order && order !== 'random' ? this.collection.orderBy(order) : this.collection;
    const res = await col.toArray();
    return order === 'random'
      ? shuffleArray(res)
      : orderDirection === OrderDirection.Desc
      ? res.reverse()
      : res;
  }

  public async find(
    criteria: SearchCriterias<V>,
    order?: SearchOrder<V>,
    orderDirection?: OrderDirection,
    matchAny?: boolean,
  ): Promise<V[]> {
    let table = await this._find(criteria, matchAny ? 'or' : 'and');
    table = orderDirection === OrderDirection.Desc ? table.reverse() : table;

    if (order === 'random') {
      return shuffleArray(await table.toArray());
    } else {
      // table.reverse() can be an order of magnitude slower as a javascript .reverse() call at the end
      // (tested at ~5000 items, 500ms instead of 100ms)
      // easy to verify here https://jsfiddle.net/dfahlander/xf2zrL4p
      const res = await (order ? table.sortBy(order) : table.toArray());
      return orderDirection === OrderDirection.Desc ? res.reverse() : res;
    }

    // Slower alternative
    // table = count ? table.limit(count) : table;
    // return order ? table.sortBy(order as string) : table.toArray();
  }

  public async count(criteria?: SearchCriterias<V>): Promise<number> {
    if (criteria === undefined) {
      return this.collection.count();
    }
    const table = await this._find(criteria);
    return table.count();
  }

  public async create(item: V): Promise<void> {
    await this.collection.put(item);
  }

  public async createMany(items: V[]): Promise<void> {
    await this.collection.bulkAdd(items);
  }

  public async remove(item: K): Promise<void> {
    return this.collection.delete(item);
  }

  public async removeMany(items: K[]): Promise<void> {
    return this.collection.bulkDelete(items);
  }

  public async update(item: V): Promise<void> {
    await this.collection.put(item);
  }

  public async updateMany(items: V[]): Promise<void> {
    await this.collection.bulkPut(items); // note: this will also create them if they don't exist
  }

  private async _find(
    criteria: SearchCriterias<V>,
    conjunction: SearchConjunction = 'and',
  ): Promise<Dexie.Collection<V, string>> {
    // Searching with multiple 'wheres': https://stackoverflow.com/questions/35679590/dexiejs-indexeddb-chain-multiple-where-clauses
    // Unfortunately doesn't work out of the box.
    // It's one of the things they are working on, looks much better: https://github.com/dfahlander/Dexie.js/issues/427
    // We'll have to mostly rely on naive filter function (lambdas)

    const criteriaList = Array.isArray(criteria) ? criteria : [criteria];
    if (criteriaList.length > 1 && conjunction === 'or') {
      // OR: We can only chain ORs if all filters can be "where" functions - else we do an ugly .some() check on every document

      let allWheres = true;
      let table: Dexie.Collection<V, string> | undefined = undefined;
      for (const crit of criteriaList) {
        const where = !table ? this.collection.where(crit.key) : table.or(crit.key);
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

    const where = this.collection.where(firstCrit.key);
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

  private _filterWhere(where: WhereClause<V, string>, crit: DBSearchCriteria<V, any>) {
    switch (crit.valueType) {
      case 'array':
        return this._filterArrayWhere(where, crit);
      case 'string':
        return this._filterStringWhere(where, crit);
      case 'number':
        return this._filterNumberWhere(where, crit);
      case 'date':
        return this._filterDateWhere(where, crit);
    }
  }

  private _filterLambda(crit: DBSearchCriteria<V, any>) {
    switch (crit.valueType) {
      case 'array':
        return this._filterArrayLambda(crit);
      case 'string':
        return this._filterStringLambda(crit);
      case 'number':
        return this._filterNumberLambda(crit);
      case 'date':
        return this._filterDateLambda(crit);
    }
  }

  private _filterArrayWhere(where: WhereClause<V, string>, crit: DBArraySearchCriteria<V, any>) {
    // Querying array props: https://dexie.org/docs/MultiEntry-Index
    // Check whether to search for empty arrays (e.g. no tags)
    if (crit.value.length === 0) {
      return crit.operator === 'contains'
        ? (val: V): boolean => (val as any)[crit.key].length === 0
        : (val: V): boolean => (val as any)[crit.key].length !== 0;
    } else {
      // contains/notContains 1 or more elements
      if (crit.operator === 'contains') {
        return where.anyOf(crit.value).distinct();
      } else {
        // not contains: there as a noneOf() function we used to use, but it matches every item individually, e.g.
        // an item with tags "Apple, Pear" is matched twice: once as Apple, once as Pear; A "notContains Apple" still matches for Pear
        return (val: V): boolean =>
          (val as any)[crit.key].every((val: string) => !crit.value.includes(val));
      }
    }
  }

  private _filterArrayLambda(crit: DBArraySearchCriteria<V, any>) {
    if (crit.operator === 'contains') {
      // Check whether to search for empty arrays (e.g. no tags)
      return crit.value.length === 0
        ? (val: V): boolean => (val as any)[crit.key].length === 0
        : (val: V): boolean =>
            crit.value.some((item) => (val as any)[crit.key].indexOf(item) !== -1);
    } else {
      // not contains
      return crit.value.length === 0
        ? (val: V): boolean => (val as any)[crit.key].length !== 0
        : (val: V): boolean =>
            crit.value.every((item) => (val as any)[crit.key].indexOf(item) === -1);
    }
  }

  private _filterStringWhere(where: WhereClause<V, string>, crit: DBStringSearchCriteria<V>) {
    const { key, operator, value } = crit;

    switch (operator) {
      case 'equals':
        return where.equals(value);
      case 'equalsIgnoreCase':
        return where.equalsIgnoreCase(value);
      case 'notEqual':
        return where.notEqual(value);
      // Use normal string filter as fallback for functions not supported by the DB
      case 'contains':
      case 'notContains':
        return this._filterStringLambda(crit);
      case 'startsWith':
        return where.startsWith(value);
      case 'startsWithIgnoreCase':
        return where.startsWithIgnoreCase(value);
      case 'notStartsWith': {
        // https://stackoverflow.com/questions/1026069/how-do-i-make-the-first-letter-of-a-string-uppercase-in-javascript/53930826#53930826

        function upperCaseFirstLetter(input: string): string {
          return input.replace(/^\p{CWU}/u, (char) => char.toUpperCase());
        }

        function lowerCaseFirstLetter(input: string): string {
          return input.replace(/^\p{CWU}/u, (char) => char.toLowerCase());
        }

        // Lexographic ordering
        // Upper case letters come before lower case letters (ASCII-betical).
        const upperNeedleLowerBound = value.toUpperCase();
        const lowerNeedleUpperBound = value.toLowerCase();
        const upperNeedleUpperBound = upperCaseFirstLetter(lowerNeedleUpperBound);
        const lowerNeedleLowerBound = lowerCaseFirstLetter(upperNeedleLowerBound);

        // Runs three range queries in parallel
        return where
          .below(upperNeedleLowerBound)
          .or(key)
          .between(upperNeedleUpperBound + '\uffff' + '\uffff', lowerNeedleLowerBound)
          .or(key)
          .above(lowerNeedleUpperBound + '\uffff');
      }
      default:
        const _exhaustiveCheck: never = operator;
        return _exhaustiveCheck;
    }
  }

  private _filterStringLambda({ key, operator, value }: DBStringSearchCriteria<V>) {
    const valLow = value.toLowerCase();

    switch (operator) {
      case 'equals':
      case 'equalsIgnoreCase':
        return (t: any) => (t[key] as string).toLowerCase() === valLow;
      case 'notEqual':
        return (t: any) => (t[key] as string).toLowerCase() !== valLow;
      case 'contains':
        return (t: any) => (t[key] as string).toLowerCase().includes(valLow);
      case 'notContains':
        return (t: any) => !(t[key] as string).toLowerCase().includes(valLow);
      case 'startsWith':
      case 'startsWithIgnoreCase':
        return (t: any) => (t[key] as string).toLowerCase().startsWith(valLow);
      case 'notStartsWith':
        return (t: any) => !(t[key] as string).toLowerCase().startsWith(valLow);
      default:
        const _exhaustiveCheck: never = operator;
        return _exhaustiveCheck;
    }
  }

  private _filterNumberWhere(
    where: WhereClause<V, string>,
    { operator, value }: DBNumberSearchCriteria<V>,
  ): Dexie.Collection<V, string> {
    switch (operator) {
      case 'equals':
        return where.equals(value);
      case 'notEqual':
        return where.notEqual(value);
      case 'smallerThan':
        return where.below(value);
      case 'smallerThanOrEquals':
        return where.belowOrEqual(value);
      case 'greaterThan':
        return where.above(value);
      case 'greaterThanOrEquals':
        return where.aboveOrEqual(value);
      default:
        const _exhaustiveCheck: never = operator;
        return _exhaustiveCheck;
    }
  }

  private _filterNumberLambda({ key, operator, value }: DBNumberSearchCriteria<V>) {
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
        const _exhaustiveCheck: never = operator;
        return _exhaustiveCheck;
    }
  }

  private _filterDateWhere(
    where: WhereClause<V, string>,
    { key, operator, value }: DBDateSearchCriteria<V>,
  ): Dexie.Collection<V, string> {
    const dateStart = new Date(value);
    dateStart.setHours(0, 0, 0);
    const dateEnd = new Date(value);
    dateEnd.setHours(23, 59, 59);

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
      // not equal to this day, so before 0:00 or after 23:59
      case 'notEqual':
        return where.below(dateStart).or(key).above(dateEnd);
      default:
        const _exhaustiveCheck: never = operator;
        return _exhaustiveCheck;
    }
  }

  private _filterDateLambda({ key, operator, value }: DBDateSearchCriteria<V>) {
    const start = new Date(value);
    start.setHours(0, 0, 0);
    const end = new Date(value);
    end.setHours(23, 59, 59);

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
        const _exhaustiveCheck: never = operator;
        return _exhaustiveCheck;
    }
  }
}
