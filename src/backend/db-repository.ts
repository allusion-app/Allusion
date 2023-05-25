import Dexie, { IndexableType, Transaction, WhereClause } from 'dexie';
import { shuffleArray } from 'common/core';
import { IRepository } from './repository';
import { ID } from 'src/api/id';
import {
  ConditionDTO,
  ArrayConditionDTO,
  StringConditionDTO,
  NumberConditionDTO,
  DateConditionDTO,
  OrderBy,
  OrderDirection,
} from '../api/data-storage-search';

export type DBCollectionConfig = {
  name: string;
  schema: string;
};

export type DBVersioningConfig = {
  version: number;
  collections: DBCollectionConfig[];
  upgrade?: (tx: Transaction) => void | Promise<void>;
};

/**
 * A function that should be called before using the database.
 * It initializes the object stores
 */
export const dbInit = (configs: DBVersioningConfig[], dbName: string): Dexie => {
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

type SearchConjunction = 'and' | 'or';

/**
 * A class that manages data retrieval and updating with a database.
 * Extends Dexie: https://dexie.org/docs/Tutorial/Consuming-dexie-as-a-module
 */
export default class BaseRepository<T> implements IRepository<T> {
  private readonly collection: Dexie.Table<T, ID>;

  constructor(collectionName: string, db: Dexie) {
    this.collection = db.table(collectionName);
  }

  public async get(id: ID): Promise<T | undefined> {
    return this.collection.get(id);
  }

  public async getByIds(ids: ID[]): Promise<(T | undefined)[]> {
    return this.collection.bulkGet(ids);
  }

  public async getByKey(key: keyof T, value: IndexableType): Promise<T[]> {
    return this.collection
      .where(key as string)
      .equals(value)
      .toArray();
  }

  public async getAll(): Promise<T[]> {
    return this.collection.toArray();
  }

  public async getAllOrdered(order: OrderBy<T>, orderDirection: OrderDirection): Promise<T[]> {
    if (order === 'random') {
      return shuffleArray(await this.collection.toArray());
    }

    const collection = this.collection.orderBy(order);
    const items = await collection.toArray();
    return orderDirection === OrderDirection.Desc ? items.reverse() : items;
  }

  public async find(
    criterias: [ConditionDTO<T>, ...ConditionDTO<T>[]],
    order: OrderBy<T>,
    orderDirection: OrderDirection,
    matchAny: boolean = false,
  ): Promise<T[]> {
    const collection = await this.filter(criterias, matchAny ? 'or' : 'and');

    if (order === 'random') {
      return shuffleArray(await collection.toArray());
    } else {
      // table.reverse() can be an order of magnitude slower than a javascript .reverse() call
      // (tested at ~5000 items, 500ms instead of 100ms)
      // easy to verify here https://jsfiddle.net/dfahlander/xf2zrL4p
      const items = await collection.sortBy(order);
      return orderDirection === OrderDirection.Desc ? items.reverse() : items;
    }
  }

  public async findExact(criteria: ConditionDTO<T>): Promise<T[]> {
    const collection = await this.filter([criteria], 'and');
    return collection.toArray();
  }

  public async count(): Promise<number> {
    return this.collection.count();
  }

  public async countExact(criteria: ConditionDTO<T>): Promise<number> {
    const collection = await this.filter([criteria], 'and');
    return collection.count();
  }

  public async create(item: T): Promise<void> {
    await this.collection.put(item);
  }

  public async createMany(items: T[]): Promise<void> {
    await this.collection.bulkAdd(items);
  }

  public async remove(item: ID): Promise<void> {
    return this.collection.delete(item);
  }

  public async removeMany(items: ID[]): Promise<void> {
    return this.collection.bulkDelete(items);
  }

  public async update(item: T): Promise<void> {
    await this.collection.put(item);
  }

  public async updateMany(items: T[]): Promise<void> {
    await this.collection.bulkPut(items); // note: this will also create them if they don't exist
  }

  private async filter(
    criterias: [ConditionDTO<T>, ...ConditionDTO<T>[]],
    conjunction: SearchConjunction,
  ): Promise<Dexie.Collection<T, string>> {
    // Searching with multiple 'wheres': https://stackoverflow.com/questions/35679590/dexiejs-indexeddb-chain-multiple-where-clauses
    // Unfortunately doesn't work out of the box.
    // It's one of the things they are working on, looks much better: https://github.com/dfahlander/Dexie.js/issues/427
    // We'll have to mostly rely on naive filter function (lambdas)

    if (criterias.length > 1 && conjunction === 'or') {
      // OR: We can only chain ORs if all filters can be "where" functions - else we do an ugly .some() check on every document

      let allWheres = true;
      let table: Dexie.Collection<T, string> | undefined = undefined;
      for (const crit of criterias) {
        const where = !table ? this.collection.where(crit.key) : table.or(crit.key);
        const tableOrFilter = this.filterWhere(where, crit);

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
        const critLambdas = criterias.map((crit) => this.filterLambda(crit));
        return this.collection.filter((t) => critLambdas.some((lambda) => lambda(t)));
      }
    }

    // AND: We can get some efficiency for ANDS by separating the first crit from the rest...
    // Dexie can use a fast "where" search for the initial search
    // For consecutive "and" conjunctions, a lambda function must be used
    // Since not all operators we need are supported by "where" filters, _filterWhere can also return a lambda.
    const [firstCrit, ...otherCrits] = criterias;

    const where = this.collection.where(firstCrit.key);
    const whereOrFilter = this.filterWhere(where, firstCrit);
    let table =
      typeof whereOrFilter !== 'function' ? whereOrFilter : this.collection.filter(whereOrFilter);

    // Then just chain a loop of and() calls. A .every() feels more efficient than chaining table.and() calls
    if (otherCrits.length) {
      table = table.and((item) => otherCrits.every((crit) => this.filterLambda(crit)(item)));
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

  private filterWhere(where: WhereClause<T, string>, crit: ConditionDTO<T>) {
    switch (crit.valueType) {
      case 'array':
        return this.filterArrayWhere(where, crit);
      case 'string':
        return this.filterStringWhere(where, crit);
      case 'number':
        return this.filterNumberWhere(where, crit);
      case 'date':
        return this.filterDateWhere(where, crit);
    }
  }

  private filterLambda(crit: ConditionDTO<T>) {
    switch (crit.valueType) {
      case 'array':
        return this.filterArrayLambda(crit);
      case 'string':
        return this.filterStringLambda(crit);
      case 'number':
        return this.filterNumberLambda(crit);
      case 'date':
        return this.filterDateLambda(crit);
    }
  }

  private filterArrayWhere(where: WhereClause<T, string>, crit: ArrayConditionDTO<T, any>) {
    // Querying array props: https://dexie.org/docs/MultiEntry-Index
    // Check whether to search for empty arrays (e.g. no tags)
    if (crit.value.length === 0) {
      return crit.operator === 'contains'
        ? (val: T): boolean => (val as any)[crit.key].length === 0
        : (val: T): boolean => (val as any)[crit.key].length !== 0;
    } else {
      // contains/notContains 1 or more elements
      if (crit.operator === 'contains') {
        return where.anyOf(crit.value).distinct();
      } else {
        // not contains: there as a noneOf() function we used to use, but it matches every item individually, e.g.
        // an item with tags "Apple, Pear" is matched twice: once as Apple, once as Pear; A "notContains Apple" still matches for Pear
        return (val: T): boolean =>
          (val as any)[crit.key].every((val: string) => !crit.value.includes(val));
      }
    }
  }

  private filterArrayLambda(crit: ArrayConditionDTO<T, any>) {
    if (crit.operator === 'contains') {
      // Check whether to search for empty arrays (e.g. no tags)
      return crit.value.length === 0
        ? (val: T): boolean => (val as any)[crit.key].length === 0
        : (val: T): boolean =>
            crit.value.some((item) => (val as any)[crit.key].indexOf(item) !== -1);
    } else {
      // not contains
      return crit.value.length === 0
        ? (val: T): boolean => (val as any)[crit.key].length !== 0
        : (val: T): boolean =>
            crit.value.every((item) => (val as any)[crit.key].indexOf(item) === -1);
    }
  }

  private filterStringWhere(where: WhereClause<T, string>, crit: StringConditionDTO<T>) {
    const dbStringOperators = [
      'equalsIgnoreCase',
      'equals',
      'notEqual',
      'startsWithIgnoreCase',
      'startsWith',
    ] as const;

    if ((dbStringOperators as readonly string[]).includes(crit.operator)) {
      const funcName = crit.operator as unknown as (typeof dbStringOperators)[number];
      return where[funcName](crit.value);
    }
    // Use normal string filter as fallback for functions not supported by the DB
    return this.filterStringLambda(crit);
  }

  private filterStringLambda(crit: StringConditionDTO<T>) {
    const { key, value } = crit;
    const valLow = value.toLowerCase();

    switch (crit.operator) {
      case 'equals':
        return (t: any) => (t[key] as string).toLowerCase() === valLow;
      case 'notEqual':
        return (t: any) => (t[key] as string).toLowerCase() !== valLow;
      case 'contains':
        return (t: any) => (t[key] as string).toLowerCase().includes(valLow);
      case 'notContains':
        return (t: any) => !(t[key] as string).toLowerCase().includes(valLow);
      case 'startsWith':
        return (t: any) => (t[key] as string).toLowerCase().startsWith(valLow);
      case 'notStartsWith':
        return (t: any) => !(t[key] as string).toLowerCase().startsWith(valLow);
      default:
        console.log('String operator not allowed:', crit.operator);
        return () => false;
    }
  }

  private filterNumberWhere(where: WhereClause<T, string>, crit: NumberConditionDTO<T>) {
    switch (crit.operator) {
      case 'equals':
        return where.equals(crit.value);
      case 'notEqual':
        return where.notEqual(crit.value);
      case 'smallerThan':
        return where.below(crit.value);
      case 'smallerThanOrEquals':
        return where.belowOrEqual(crit.value);
      case 'greaterThan':
        return where.above(crit.value);
      case 'greaterThanOrEquals':
        return where.aboveOrEqual(crit.value);
      default:
        const _exhaustiveCheck: never = crit.operator;
        return _exhaustiveCheck;
    }
  }

  private filterNumberLambda(crit: NumberConditionDTO<T>) {
    const { key, value } = crit;

    switch (crit.operator) {
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
        const _exhaustiveCheck: never = crit.operator;
        return _exhaustiveCheck;
    }
  }

  private filterDateWhere(where: WhereClause<T, string>, crit: DateConditionDTO<T>) {
    const dateStart = new Date(crit.value);
    dateStart.setHours(0, 0, 0);
    const dateEnd = new Date(crit.value);
    dateEnd.setHours(23, 59, 59);

    switch (crit.operator) {
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
        return where.below(dateStart).or(crit.key).above(dateEnd);
      default:
        const _exhaustiveCheck: never = crit.operator;
        return _exhaustiveCheck;
    }
  }

  private filterDateLambda(crit: DateConditionDTO<T>) {
    const { key } = crit;
    const start = new Date(crit.value);
    start.setHours(0, 0, 0);
    const end = new Date(crit.value);
    end.setHours(23, 59, 59);

    switch (crit.operator) {
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
        const _exhaustiveCheck: never = crit.operator;
        return _exhaustiveCheck;
    }
  }
}
