import Dexie from 'dexie';
import { ID, IIdentifiable } from '../entities/ID';
import {
  SearchCriteria, IIDsSearchCriteria, IStringSearchCriteria,
  INumberSearchCriteria, IDateSearchCriteria,
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

// type DexieFuncType = 'equals' | 'notEqual' | 'below' | 'belowOrEqual' | 'above'
//   | 'between' | 'equalsIgnoreCase' | 'startsWithIgnoreCase' | 'anyOf' | 'noneOf';

// interface IOperatorDict {
//   [key: string]: DexieFuncType;
// }

// const STRING_OPERATOR_DICT: IOperatorDict = {
//   equals: 'equalsIgnoreCase',
//   startsWithIgnoreCase: 'startsWithIgnoreCase',
// };

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
    // Unfortunately doesn't work out of the box...
    // Separate first where from the rest
    const [firstCrit, ...otherCrits] = Array.isArray(criteria) ? criteria : [criteria];

    const where = this.collection.where(firstCrit.key as string);

    // Now we have to map our criteria to something that Dexie understands
    let table = where.equals(firstCrit.value);
    switch (firstCrit.valueType) {
      case 'array':
        // Querying array props: https://dexie.org/docs/MultiEntry-Index
        const idsCrit = firstCrit as IIDsSearchCriteria<T>;
        // Check whether to search for empty arrays (e.g. no tags)
        if (idsCrit.value.length === 0) {
          table = firstCrit.operator === 'contains'
            ? table.filter((val: any) => val[firstCrit.key as string].length === 0)
            : table.filter((val: any) => val[firstCrit.key as string].length !== 0);
        } else {
          const idsFuncName = firstCrit.operator === 'contains' ? 'anyOf' : 'noneOf';
          table = where[idsFuncName](idsCrit.value).distinct();
        }
        break;
      case 'string':
        const stringCrit = firstCrit as IStringSearchCriteria<T>;
        const stringFuncName =
          stringCrit.operator === 'equals' ?     'equalsIgnoreCase' :
          stringCrit.operator === 'startsWith' ? 'startsWithIgnoreCase' :
                                                 'notEqual';
        // Todo: No support for notStartsWith, notEqualIgnoreCase, contains, notContains
        table = where[stringFuncName](stringCrit.value);
        break;
      case 'number':
        const numberCrit = firstCrit as INumberSearchCriteria<T>;
        const numberFuncName =
          numberCrit.operator === 'equals'              ? 'equals' :
          numberCrit.operator === 'notEqual'            ? 'notEqual' :
          numberCrit.operator === 'smallerThan'         ? 'below' :
          numberCrit.operator === 'smallerThanOrEquals' ? 'belowOrEqual' :
          numberCrit.operator === 'greaterThan'         ? 'above' :
                                                          'aboveOrEqual';
        table = where[numberFuncName](numberCrit.value);
        break;
      case 'date':
        const dateCrit = firstCrit as IDateSearchCriteria<T>;
        const dateEnd = new Date(dateCrit.value);
        dateEnd.setHours(23, 59, 59);
        table =
         (dateCrit.operator === 'equals')              ? where.between(dateCrit.value, dateEnd) : // equal to this day, so between 0:00 and 23:59
         (dateCrit.operator === 'smallerThan')         ? where.below(dateCrit.value) :
         (dateCrit.operator === 'smallerThanOrEquals') ? where.below(dateEnd) :
         (dateCrit.operator === 'greaterThan')         ? where.above(dateEnd) :
         (dateCrit.operator === 'greaterThanOrEquals') ? where.above(dateCrit.value) :
                                                         where.notEqual(dateCrit.value);
        // todo: notEqual doesn't work like this for dates, needs to be 'notBetween' but doesn't exist
        break;
    }

    const matchAny = false; // todo: get as param
    // const matchFuncName = matchAny ? 'or' : 'and';

    // Whether the other criteria should be applied as AND /or/ OR
    if (matchAny) {
      // OR can be done in a similar manner to the first criteria. Needs some refactoring
      // Maybe can also be done same way as AND
    } else {
      // AND must be done with a filter function over each entry
      for (const crit of otherCrits as Array<SearchCriteria<T>>) {
        switch (crit.valueType) {
          case 'array':
            const idsCrit = crit as IIDsSearchCriteria<T>;
            if (firstCrit.operator === 'contains') {
              table = (idsCrit.value.length === 0)
                ? table.and((val: any) => val[crit.key as string].length === 0)
                : table.and((val: any) => idsCrit.value.every((item) => val[crit.key as string].contains(item)));
            } else { // not contains
              table = (idsCrit.value.length === 0)
                ? table.and((val: any) => val[crit.key as string].length !== 0)
                : table.and((val: any) => !idsCrit.value.some((item) => val[crit.key as string].contains(item)));
            }
            break;
          case 'string':
            const { operator: op, key, value } = firstCrit as IStringSearchCriteria<T>;
            console.log(op, value);
            const valLow = value.toLowerCase();
            table =
              op === 'equals' ?   table.and((t: any) => (t[key] as string).toLowerCase() === valLow) :
              op === 'notEqual' ? table.and((t: any) => (t[key] as string).toLowerCase() !== valLow) :
              op === 'contains' ?    table.and((t: any) => (t[key] as string).toLowerCase().indexOf(valLow) !== -1) :
              op === 'notContains' ? table.and((t: any) => (t[key] as string).toLowerCase().indexOf(valLow) === -1) :
              op === 'startsWith' ? table.and((t: any) => (t[key] as string).toLowerCase().startsWith(valLow)) :
              /*notStartsWith*/     table.and((t: any) => !(t[key] as string).toLowerCase().startsWith(valLow));
            break;
          case 'number':
            const numberCrit = firstCrit as INumberSearchCriteria<T>;
            const numOp = numberCrit.operator;
            table =
              numOp === 'equals' ? table.and((t: any) => (t[key] as number) === numberCrit.value) :
              numOp === 'notEqual' ? table.and((t: any) => (t[key] as number) !== numberCrit.value) :
              numOp === 'smallerThan' ? table.and((t: any) => (t[key] as number) < numberCrit.value) :
              numOp === 'smallerThanOrEquals' ? table.and((t: any) => (t[key] as number) <= numberCrit.value) :
              numOp === 'greaterThan' ? table.and((t: any) => (t[key] as number) > numberCrit.value) :
              /* greaterThanOrEquals */ table.and((t: any) => (t[key] as number) >= numberCrit.value);
            break;
          case 'date':
            const dateCrit = firstCrit as IDateSearchCriteria<T>;
            const start = new Date(dateCrit.value);
            const end = new Date(dateCrit.value);
            end.setHours(23, 59, 59);
            const dateOp = dateCrit.operator;

            table =
              dateOp === 'equals' ? table.and((t: any) => t[key] >= start || t[key] <= end) :
              dateOp === 'notEqual' ? table.and((t: any) =>  t[key] < start || t[key] > end) :
              dateOp === 'smallerThan' ? table.and((t: any) => t[key] < start) :
              dateOp === 'smallerThanOrEquals' ? table.and((t: any) => t[key] <= end) :
              dateOp === 'greaterThan' ? table.and((t: any) => t[key] > end) :
              /* greaterThanOrEquals */ table.and((t: any) => t[key] >= start);

            break;
        }
      }
    }

    return table;
  }
}
