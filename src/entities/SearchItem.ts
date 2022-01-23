import { action, makeObservable, observable } from 'mobx';
import RootStore from 'src/frontend/stores/RootStore';
import { IFile } from './File';
import { ID } from './ID';
import { ClientBaseCriteria, SearchCriteria } from './SearchCriteria';

export interface ISearchItem<T> {
  id: ID;
  name: string;
  criteria: SearchCriteria<T>[];
  matchAny?: boolean;
}

export class ClientSearchItem<T> {
  id: ID;
  @observable name: string = '';
  @observable matchAny: boolean = false;
  criteria = observable<ClientBaseCriteria<T>>([]);

  // TODO: also store sort mode? (filename, descending, etc)
  // Then it wouldn't be a "Saved Search", but a "Saved view" maybe?

  constructor(id: ID, name: string, criteria: SearchCriteria<T>[], matchAny: boolean) {
    this.id = id;
    this.name = name;
    this.criteria.push(...criteria.map((c) => ClientBaseCriteria.deserialize(c)));
    this.matchAny = matchAny;

    makeObservable(this);
  }

  @action.bound setName(value: string): void {
    this.name = value;
  }

  @action.bound setMatchAny(value: boolean): void {
    this.matchAny = value;
  }

  @action.bound setCriteria(newCriteria: ClientBaseCriteria<T>[]): void {
    this.criteria.replace(newCriteria);
  }

  @action.bound serialize(rootStore: RootStore): ISearchItem<T> {
    return {
      id: this.id,
      name: this.name,
      criteria: this.criteria.toJSON().map((c) => c.serialize(rootStore)),
      matchAny: this.matchAny,
    };
  }
}

export type IFileSearchItem = ISearchItem<IFile>;
export class ClientFileSearchItem extends ClientSearchItem<IFile> {}
