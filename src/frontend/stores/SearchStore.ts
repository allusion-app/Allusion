import { retainArray } from 'common/core';
import { action, makeObservable, observable, runInAction } from 'mobx';
import Backend from 'src/backend/Backend';
import { generateId } from 'src/entities/ID';
import {
  ClientFileSearchCriteria,
  IFileSearchCriteria,
  TagSearchCriteria,
} from 'src/entities/SearchCriteria';
import { ClientFileSearch } from 'src/entities/SearchItem';
import { NumberOperatorType, StringOperatorType } from 'src/backend/DBSearchCriteria';
import RootStore from './RootStore';
import { camelCaseToSpaced } from 'common/fmt';

/**
 * Based on https://mobx.js.org/best/store.html
 */
class SearchStore {
  private readonly backend: Backend;

  public readonly searchList = observable<ClientFileSearch>([]);

  constructor(backend: Backend) {
    this.backend = backend;

    makeObservable(this);
  }

  public async init() {
    try {
      const fetchedSearches = await this.backend.fetchSearches();
      fetchedSearches.sort((a, b) => a.index - b.index);

      const searches = fetchedSearches.map(
        (backendSearch) =>
          new ClientFileSearch(
            backendSearch.id,
            backendSearch.name,
            backendSearch.criterias,
            backendSearch.matchAny,
          ),
      );

      runInAction(() => {
        this.searchList.replace(searches);
      });
    } catch (err) {
      console.log('Could not load searches', err);
    }
  }

  @action
  public async create(search: ClientFileSearch) {
    const index = this.searchList.length;
    this.searchList.push(search);
    await this.backend.createSearch(search.serialize(index));
    return search;
  }

  @action
  public async remove(search: ClientFileSearch) {
    const searchID = search.id;
    retainArray(this.searchList, (search) => search.id !== searchID);
    await this.backend.removeSearch(searchID);
  }

  @action.bound
  public async duplicate(search: ClientFileSearch) {
    const newSearch = new ClientFileSearch(
      generateId(),
      `${search.name} (copy)`,
      search.criterias.map(ClientFileSearchCriteria.clone),
      search.matchAny,
    );
    // TODO: insert below given item or keep it at the end like this?
    const index = this.searchList.length;
    this.searchList.push(newSearch);
    await this.backend.createSearch(newSearch.serialize(index));
    return newSearch;
  }

  /** Source is moved to where Target currently is */
  @action
  public reorder(source: ClientFileSearch, target: ClientFileSearch) {
    const sourceIndex = this.searchList.indexOf(source);
    const targetIndex = this.searchList.indexOf(target);

    // Remove the source element and insert it at the target index
    this.searchList.remove(source);
    this.searchList.splice(targetIndex, 0, source);

    // Update the index for all changed items: all items between source and target have been moved
    const startIndex = Math.min(sourceIndex, targetIndex);
    const endIndex = Math.max(sourceIndex, targetIndex);

    this.backend.saveSearches(
      this.searchList
        .slice(startIndex, endIndex + 1)
        .map((search, index) => search.serialize(index)),
    );
  }

  public save(search: ClientFileSearch) {
    const searchID = search.id;
    const index = this.searchList.findIndex((search) => search.id === searchID);

    if (index > -1) {
      this.backend.saveSearch(search.serialize(index));
    }
  }
}

export default SearchStore;

export function getLabel(rootStore: RootStore, criteria: IFileSearchCriteria) {
  switch (criteria.key) {
    case 'tags':
      if (isUntaggedCriteria(criteria)) {
        return 'Untagged images';
      } else {
        return `${camelCaseToSpaced(criteria.key)} ${camelCaseToSpaced(criteria.operator)} ${
          criteria.value.length === 0 ? 'no tags' : rootStore.tagStore.get(criteria.value[0])?.name
        }`;
      }

    case 'absolutePath':
      return `Path ${getStringOperatorLabel(criteria.operator)} "${criteria.value}"`;

    case 'extension':
    case 'name':
      return `${camelCaseToSpaced(criteria.key)} ${getStringOperatorLabel(criteria.operator)} "${
        criteria.value
      }"`;

    case 'size':
      return `${camelCaseToSpaced(criteria.key)} ${getNumberOperatorSymbol(criteria.operator)} ${
        criteria.value
      }`;

    case 'dateAdded':
      return `${camelCaseToSpaced(criteria.key)} ${getNumberOperatorSymbol(
        criteria.operator,
      )} ${criteria.value.toLocaleDateString()}`;

    default:
      const _exhaustiveCheck: never = criteria;
      return _exhaustiveCheck;
  }
}

export function isUntaggedCriteria(criteria: TagSearchCriteria): boolean {
  return criteria.value.length === 0 && !criteria.operator.toLowerCase().includes('not');
}

export function getNumberOperatorSymbol(operator: NumberOperatorType): string {
  switch (operator) {
    case 'equals':
      return '=';
    case 'notEqual':
      return '≠';
    case 'smallerThan':
      return '<';
    case 'smallerThanOrEquals':
      return '≤';
    case 'greaterThan':
      return '>';
    case 'greaterThanOrEquals':
      return '≥';

    default:
      const _exhaustiveCheck: never = operator;
      return _exhaustiveCheck;
  }
}

export function getStringOperatorLabel(operator: StringOperatorType): string {
  switch (operator) {
    case 'equalsIgnoreCase': // not available as dropdown option to user to avoid clutter
    case 'equals':
      return 'Equals';
    case 'notEqual':
      return 'Not Equal';
    case 'startsWithIgnoreCase': // not available as dropdown option to user to avoid clutter
    case 'startsWith':
      return 'Starts With';
    case 'notStartsWith':
      return 'Not Starts With';
    case 'contains':
      return 'Contains';
    case 'notContains':
      return 'Not Contains';

    default:
      const _exhaustiveCheck: never = operator;
      return _exhaustiveCheck;
  }
}
