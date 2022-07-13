import { IObservableArray, makeObservable, observable } from 'mobx';
import { ID } from 'src/api/ID';
import { FileSearchCriteriaDTO, FileSearchDTO } from 'src/api/FileSearchDTO';

export class ClientFileSearch {
  public readonly id: ID;
  @observable
  public name: string;
  @observable
  public matchAny: boolean;
  public readonly criterias: IObservableArray<FileSearchCriteriaDTO>;

  constructor(id: ID, name: string, criterias: Array<FileSearchCriteriaDTO>, matchAny: boolean) {
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

  public setCriterias(...newCriterias: FileSearchCriteriaDTO[]): void {
    this.criterias.replace(newCriterias);
  }

  public serialize(index: number): FileSearchDTO {
    return {
      id: this.id,
      name: this.name,
      criterias: this.criterias.map((criteria) => ({ ...criteria })),
      matchAny: this.matchAny,
      index,
    };
  }
}
