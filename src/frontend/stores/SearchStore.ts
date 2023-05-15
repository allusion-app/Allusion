import { action, makeObservable, observable } from 'mobx';
import { IDataStorage } from 'src/api/data-storage';
import { generateId, ID } from 'src/api/id';
import { ClientFileSearchCriteria } from 'src/entities/SearchCriteria';
import { ClientFileSearchItem } from 'src/entities/SearchItem';
import RootStore from './RootStore';
import { PositionSource } from 'position-strings';
import { SearchCriteria } from 'src/api/search-criteria';
import { moveAfter, moveBefore } from './move';

/**
 * Based on https://mobx.js.org/best/store.html
 */
class SearchStore {
  private readonly backend: IDataStorage;
  private readonly rootStore: RootStore;

  readonly #positions = new PositionSource({ ID: 's' });
  readonly searchList = observable<ClientFileSearchItem>([]);

  constructor(backend: IDataStorage, rootStore: RootStore) {
    this.backend = backend;
    this.rootStore = rootStore;

    makeObservable(this);
  }

  async init() {
    try {
      const fetchedSearches = await this.backend.fetchSearches();

      fetchedSearches.forEach((s) =>
        this.searchList.push(
          new ClientFileSearchItem(s.id, s.name, s.criteria, s.matchAny === true, s.position),
        ),
      );
    } catch (err) {
      console.log('Could not load searches', err);
    }
  }

  @action.bound get(search: ID): ClientFileSearchItem | undefined {
    return this.searchList.find((s) => s.id === search);
  }

  @action.bound async create(name: string, criteria: SearchCriteria[], matchAny: boolean) {
    const search = new ClientFileSearchItem(
      generateId(),
      name,
      criteria,
      matchAny,
      this.#positions.createBetween(this.searchList.at(-1)?.position),
    );
    this.searchList.push(search);
    await this.backend.createSearch(search.serialize(this.rootStore));
    return search;
  }

  @action.bound async remove(search: ClientFileSearchItem) {
    this.searchList.remove(search);
    await this.backend.removeSearch(search.id);
  }

  @action.bound async duplicate(search: ClientFileSearchItem) {
    const newSearch = new ClientFileSearchItem(
      generateId(),
      `${search.name} (copy)`,
      search.criteria.map((c) => c.serialize(this.rootStore)),
      search.matchAny,
      this.#positions.createBetween(this.searchList.at(-1)?.position),
    );
    // TODO: insert below given item or keep it at the end like this?
    this.searchList.push(newSearch);
    await this.backend.createSearch(newSearch.serialize(this.rootStore));
    return newSearch;
  }

  @action.bound async replaceWithActiveSearch(search: ClientFileSearchItem) {
    search.setMatchAny(this.rootStore.uiStore.searchMatchAny);
    search.setCriteria(
      this.rootStore.uiStore.searchCriteriaList.map((c) =>
        ClientFileSearchCriteria.deserialize(c.serialize(this.rootStore)),
      ),
    );
    await this.backend.saveSearch(search.serialize(this.rootStore));
  }

  @action async moveBefore(source: ClientFileSearchItem, target: ClientFileSearchItem) {
    if (moveBefore(this.searchList, this.#positions, source, target)) {
      return this.backend.saveSearch(source.serialize(this.rootStore));
    }
  }

  @action async moveAfter(source: ClientFileSearchItem, target: ClientFileSearchItem) {
    if (moveAfter(this.searchList, this.#positions, source, target)) {
      return this.backend.saveSearch(source.serialize(this.rootStore));
    }
  }

  save(search: ClientFileSearchItem) {
    this.backend.saveSearch(search.serialize(this.rootStore));
  }
}

export default SearchStore;
