import { action, makeObservable, observable } from 'mobx';

import { DataStorage } from '../../api/data-storage';
import { ID, generateId } from '../../api/id';
import { ClientFileSearchCriteria } from '../entities/SearchCriteria';
import { ClientFileSearchItem } from '../entities/SearchItem';
import RootStore from './RootStore';

/**
 * Based on https://mobx.js.org/best/store.html
 */
class SearchStore {
  private readonly backend: DataStorage;
  private readonly rootStore: RootStore;

  /** A lookup map to speedup finding entities */
  readonly searchList = observable<ClientFileSearchItem>([]);

  constructor(backend: DataStorage, rootStore: RootStore) {
    this.backend = backend;
    this.rootStore = rootStore;

    makeObservable(this);
  }

  async init(): Promise<void> {
    try {
      const fetchedSearches = await this.backend.fetchSearches();
      fetchedSearches.sort((a, b) => a.index - b.index);

      this.searchList.push(
        ...fetchedSearches.map(
          (s, i) =>
            new ClientFileSearchItem(s.id, s.name, s.criteria, s.matchAny === true, s.index ?? i),
        ),
      );
    } catch (err) {
      console.log('Could not load searches', err);
    }
  }

  @action.bound get(search: ID): ClientFileSearchItem | undefined {
    return this.searchList.find((s) => s.id === search);
  }

  @action.bound async create(search: ClientFileSearchItem): Promise<ClientFileSearchItem> {
    this.searchList.push(search);
    await this.backend.createSearch(search.serialize(this.rootStore));
    return search;
  }

  @action.bound async remove(search: ClientFileSearchItem): Promise<void> {
    // Do we need to dispose anything? There is no save handler, observable properties should be disposed automatically I believe
    this.searchList.remove(search);
    await this.backend.removeSearch(search.id);
  }

  @action.bound async duplicate(search: ClientFileSearchItem): Promise<ClientFileSearchItem> {
    const newSearch = new ClientFileSearchItem(
      generateId(),
      `${search.name} (copy)`,
      search.criteria.map((c) => c.serialize(this.rootStore)),
      search.matchAny,
      this.searchList.length,
    );
    // TODO: insert below given item or keep it at the end like this?
    this.searchList.push(newSearch);
    await this.backend.createSearch(newSearch.serialize(this.rootStore));
    return newSearch;
  }

  @action.bound replaceWithActiveSearch(search: ClientFileSearchItem): void {
    search.setMatchAny(this.rootStore.uiStore.searchMatchAny);
    search.setCriteria(
      this.rootStore.uiStore.searchCriteriaList.map((c) =>
        ClientFileSearchCriteria.deserialize(c.serialize(this.rootStore)),
      ),
    );
  }

  /** Source is moved to where Target currently is */
  @action.bound reorder(source: ClientFileSearchItem, target: ClientFileSearchItem): void {
    const sourceIndex = this.searchList.indexOf(source);
    const targetIndex = this.searchList.indexOf(target);

    // Remove the source element and insert it at the target index
    this.searchList.remove(source);
    this.searchList.splice(targetIndex, 0, source);

    // Update the index for all changed items: all items between source and target have been moved
    const startIndex = Math.min(sourceIndex, targetIndex);
    const endIndex = Math.max(sourceIndex, targetIndex);
    for (let i = startIndex; i <= endIndex; i++) {
      this.searchList[i].setIndex(i);
      this.save(this.searchList[i]);
    }
  }

  save(search: ClientFileSearchItem): void {
    this.backend.saveSearch(search.serialize(this.rootStore));
  }
}

export default SearchStore;
