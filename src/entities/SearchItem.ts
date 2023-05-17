import { action, IObservableArray, makeObservable, observable } from 'mobx';
import RootStore from 'src/frontend/stores/RootStore';
import { ID } from '../api/id';
import { ClientFileSearchCriteria } from './SearchCriteria';
import { SearchCriteria } from '../api/search-criteria';
import { FileSearchDTO } from '../api/file-search';

export class ClientFileSearchItem {
  readonly id: ID;
  @observable name: string = '';
  @observable matchAny: boolean = false;
  readonly criteria: IObservableArray<ClientFileSearchCriteria>;
  position: string;

  // TODO: also store sort mode? (filename, descending, etc)
  // Then it wouldn't be a "Saved Search", but a "Saved view" maybe?

  constructor(
    id: ID,
    name: string,
    criteria: SearchCriteria[],
    matchAny: boolean,
    position: string,
  ) {
    this.id = id;
    this.name = name;
    this.criteria = observable(criteria.map((c) => ClientFileSearchCriteria.deserialize(c)));
    this.matchAny = matchAny;
    this.position = position;

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

  serialize(rootStore: RootStore): FileSearchDTO {
    return {
      id: this.id,
      name: this.name,
      criteria: this.criteria.map((c) => c.serialize(rootStore)),
      matchAny: this.matchAny,
      position: this.position,
    };
  }
}
