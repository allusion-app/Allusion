import { action, makeObservable, observable } from 'mobx';
import { PositionSource } from 'position-strings';

import { FileSearchDTO } from 'src/api/file-search';
import { SearchCriteria } from 'src/api/search-criteria';
import { DataStorage } from '../../api/data-storage';
import { ID, generateId } from '../../api/id';
import { ClientFileSearchCriteria } from '../entities/SearchCriteria';
import { ClientFileSearchItem } from '../entities/SearchItem';
import RootStore from './RootStore';
import { moveAfter, moveBefore } from './move';

/**
 * Based on https://mobx.js.org/best/store.html
 */
class SearchStore {
  private readonly backend: DataStorage;
  private readonly rootStore: RootStore;

  // Right now the id is only set for better debugging. It should be `s${actorId}` if collaborative editing is ever
  // implemented where actorId is a unique id between collaborators (which includes multiple devices of one user).
  readonly #positions = new PositionSource({ ID: 's' });
  readonly searchList = observable<ClientFileSearchItem>([]);

  constructor(backend: DataStorage, rootStore: RootStore) {
    this.backend = backend;
    this.rootStore = rootStore;

    makeObservable(this);
  }

  @action init(fetchedSearches: FileSearchDTO[]): void {
    fetchedSearches.sort((a, b) =>
      a.position < b.position ? -1 : Number(a.position > b.position),
    );

    for (const search of fetchedSearches) {
      this.searchList.push(
        new ClientFileSearchItem(
          search.id,
          search.name,
          search.criteria,
          search.matchAny === true,
          search.position,
        ),
      );
    }
  }

  @action.bound get(search: ID): ClientFileSearchItem | undefined {
    return this.searchList.find((s) => s.id === search);
  }

  @action.bound async create(
    name: string,
    criteria: SearchCriteria[],
    matchAny: boolean,
  ): Promise<ClientFileSearchItem> {
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

  @action.bound async remove(search: ClientFileSearchItem): Promise<void> {
    this.searchList.remove(search);
    await this.backend.removeSearch(search.id);
  }

  @action.bound async duplicate(search: ClientFileSearchItem): Promise<ClientFileSearchItem> {
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

  @action.bound async replaceWithActiveSearch(search: ClientFileSearchItem): Promise<void> {
    search.setMatchAny(this.rootStore.uiStore.searchMatchAny);
    search.setCriteria(
      this.rootStore.uiStore.searchCriteriaList.map((c) =>
        ClientFileSearchCriteria.deserialize(c.serialize(this.rootStore)),
      ),
    );
    await this.backend.saveSearch(search.serialize(this.rootStore));
  }

  @action async moveBefore(
    source: ClientFileSearchItem,
    target: ClientFileSearchItem,
  ): Promise<void> {
    if (moveBefore(this.searchList, this.#positions, source, target)) {
      return this.backend.saveSearch(source.serialize(this.rootStore));
    }
  }

  @action async moveAfter(
    source: ClientFileSearchItem,
    target: ClientFileSearchItem,
  ): Promise<void> {
    if (moveAfter(this.searchList, this.#positions, source, target)) {
      return this.backend.saveSearch(source.serialize(this.rootStore));
    }
  }

  save(search: ClientFileSearchItem): void {
    this.backend.saveSearch(search.serialize(this.rootStore));
  }
}

export default SearchStore;
