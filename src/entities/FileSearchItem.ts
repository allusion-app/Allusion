import { action, IObservableArray, makeObservable, observable } from 'mobx';
import RootStore from 'src/frontend/stores/RootStore';
import { ID } from 'src/api/ID';
import { ClientFileSearchCriteria } from './SearchCriteria';
import { SearchCriteria } from 'src/api/SearchCriteria';
import { FileSearchItemDTO } from 'src/api/FileSearchItem';

export class ClientFileSearchItem {
  id: ID;
  @observable name: string = '';
  @observable matchAny: boolean = false;
  readonly criteria: IObservableArray<ClientFileSearchCriteria>;

  /** A custom index defined by the user for ordering the search items */
  index: number = 0;

  // TODO: also store sort mode? (filename, descending, etc)
  // Then it wouldn't be a "Saved Search", but a "Saved view" maybe?

  constructor(id: ID, name: string, criteria: SearchCriteria[], matchAny: boolean, index: number) {
    this.id = id;
    this.name = name;
    this.criteria = observable(criteria.map((c) => ClientFileSearchCriteria.deserialize(c)));
    this.matchAny = matchAny;
    this.index = index;

    makeObservable(this);
  }

  @action.bound setName(value: string): void {
    this.name = value;
  }

  @action.bound setMatchAny(value: boolean): void {
    this.matchAny = value;
  }

  @action.bound setCriteria(newCriteria: ClientFileSearchCriteria[]): void {
    this.criteria.replace(newCriteria);
  }

  @action.bound setIndex(newIndex: number): void {
    this.index = newIndex;
  }

  @action.bound serialize(rootStore: RootStore): FileSearchItemDTO {
    return {
      id: this.id,
      name: this.name,
      criteria: this.criteria.map((c) => c.serialize(rootStore)),
      matchAny: this.matchAny,
      index: this.index,
    };
  }
}
