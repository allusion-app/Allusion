import { action, IReactionDisposer, makeObservable, observable, reaction } from 'mobx';

import { ID } from '../../api/id';
import ScoreStore from '../stores/ScoreStore';
import { ScoreDTO } from '../../api/score';

/**
 * Represents a Score object in the client-side MobX store.
 */
export class ClientScore {
  private store: ScoreStore;
  private saveHandler: IReactionDisposer;

  readonly id: ID;
  @observable name: string = '';
  readonly dateCreated: Date;
  readonly dateModified: Date;

  constructor(store: ScoreStore, id: ID, name: string, dateCreated: Date, dateModified: Date) {
    this.store = store;
    this.id = id;
    this.name = name;
    this.dateCreated = dateCreated;
    this.dateModified = dateModified;

    makeObservable(this);
    // observe all changes to observable fields
    this.saveHandler = reaction(
      // We need to explicitly define which values this reaction should react to
      () => this.serialize(),
      // Then update the entity in the database
      (score) => {
        this.store.save(score);
      },
      { delay: 500 },
    );
  }

  @action.bound rename(name: string): void {
    this.name = name;
  }

  async delete(): Promise<void> {
    return this.store.deleteScore(this);
  }

  serialize(): ScoreDTO {
    return {
      id: this.id,
      name: this.name,
      dateCreated: this.dateCreated,
      dateModified: this.dateModified,
    };
  }

  dispose(): void {
    this.saveHandler();
  }
}
