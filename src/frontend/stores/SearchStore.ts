import { action, makeObservable, observable } from 'mobx';
import Backend from 'src/backend/Backend';
import { ID } from 'src/entities/ID';
import { ClientFileSearchItem } from 'src/entities/SearchItem';
import RootStore from './RootStore';

/**
 * Based on https://mobx.js.org/best/store.html
 */
class SearchStore {
  private readonly backend: Backend;
  private readonly rootStore: RootStore;

  /** A lookup map to speedup finding entities */
  readonly searchList = observable<ClientFileSearchItem>([]);

  constructor(backend: Backend, rootStore: RootStore) {
    this.backend = backend;
    this.rootStore = rootStore;

    makeObservable(this);
  }

  async init() {
    try {
      const fetchedSearches = await this.backend.fetchSearches();
      this.searchList.push(
        ...fetchedSearches.map(
          (s) => new ClientFileSearchItem(s.id, s.name, s.criteria, s.matchAny),
        ),
      );
    } catch (err) {
      console.log('Could not load searches', err);
    }
  }

  @action get(search: ID): ClientFileSearchItem | undefined {
    return this.searchList.find((s) => s.id === search);
  }

  @action.bound async create(search: ClientFileSearchItem) {
    this.searchList.push(search);
    await this.backend.createSearch(search.serialize(this.rootStore));
    return search;
  }

  @action remove(search: ClientFileSearchItem) {
    // TODO: dispose?
    this.backend.removeSearch(search.serialize(this.rootStore));
    return this.searchList.remove(search);
  }

  save(search: ClientFileSearchItem) {
    this.backend.saveSearch(search.serialize(this.rootStore));
  }
}

export default SearchStore;
