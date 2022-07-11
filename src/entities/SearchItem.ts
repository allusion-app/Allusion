import { IObservableArray, makeObservable, observable } from 'mobx';
import { ID } from './ID';
import { IFileSearchCriteria } from './SearchCriteria';

export type IFileSearch = {
  id: ID;
  name: string;
  criterias: IFileSearchCriteria[];
  matchAny: boolean;
  index: number;
};

export class ClientFileSearch {
  public readonly id: ID;
  @observable
  public name: string;
  @observable
  public matchAny: boolean;
  public readonly criterias: IObservableArray<IFileSearchCriteria>;

  constructor(id: ID, name: string, criterias: Array<IFileSearchCriteria>, matchAny: boolean) {
    this.id = id;
    this.name = name;
    this.criterias = observable.array(criterias);
    this.matchAny = matchAny;

    makeObservable(this);
  }

  public setName(name: string): void {
    this.name = name;
  }

  public setMatchAny(matchAny: boolean): void {
    this.matchAny = matchAny;
  }

  public setCriterias(...newCriterias: IFileSearchCriteria[]): void {
    this.criterias.replace(newCriterias);
  }

  public serialize(index: number): IFileSearch {
    return {
      id: this.id,
      name: this.name,
      criterias: this.criterias.map((criteria) => ({ ...criteria })),
      matchAny: this.matchAny,
      index,
    };
  }
}
