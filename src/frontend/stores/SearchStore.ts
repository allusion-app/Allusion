import { action, makeObservable, observable } from 'mobx';
import Backend from 'src/backend/Backend';
import { generateId, ID } from 'src/entities/ID';
import { ClientBaseCriteria } from 'src/entities/SearchCriteria';
import { ClientFileSearchItem } from 'src/entities/SearchItem';
import { Sequence } from 'common/sequence';
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
        ...Sequence.from(fetchedSearches).map(
          (s) => new ClientFileSearchItem(s.id, s.name, s.criteria, s.matchAny === true),
        ),
      );
    } catch (err) {
      console.log('Could not load searches', err);
    }
  }

  @action.bound get(search: ID): ClientFileSearchItem | undefined {
    return this.searchList.find((s) => s.id === search);
  }

  @action.bound async create(search: ClientFileSearchItem) {
    this.searchList.push(search);
    await this.backend.createSearch(search.serialize(this.rootStore));
    return search;
  }

  @action.bound async remove(search: ClientFileSearchItem) {
    // Do we need to dispose anything? There is no save handler, observable properties should be disposed automatically I believe
    this.searchList.remove(search);
    await this.backend.removeSearch(search.serialize(this.rootStore));
  }

  @action.bound async duplicate(search: ClientFileSearchItem) {
    const newSearch = new ClientFileSearchItem(
      generateId(),
      `${search.name} (copy)`,
      search.criteria.map((c) => c.serialize(this.rootStore)),
      search.matchAny,
    );
    // TODO: insert below given item or keep it at the end like this?
    this.searchList.push(newSearch);
    await this.backend.createSearch(newSearch.serialize(this.rootStore));
    return newSearch;
  }

  @action.bound replaceWithActiveSearch(search: ClientFileSearchItem) {
    search.setMatchAny(this.rootStore.uiStore.searchMatchAny);
    search.setCriteria(
      this.rootStore.uiStore.searchCriteriaList.map((c) =>
        ClientBaseCriteria.deserialize(c.serialize(this.rootStore)),
      ),
    );
  }

  save(search: ClientFileSearchItem) {
    this.backend.saveSearch(search.serialize(this.rootStore));
  }
}

export default SearchStore;
