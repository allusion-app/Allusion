import { action, computed, makeObservable, observable } from 'mobx';
import { DataStorage } from '../../api/data-storage';
import { ScoreDTO } from '../../api/score';
import { generateId, ID } from '../../api/id';
import { ClientScore } from '../entities/Score';
import RootStore from './RootStore';
import { ClientFile } from '../entities/File';

class ScoreStore {
  private readonly backend: DataStorage;
  private readonly rootStore: RootStore;

  private readonly scoreMap = observable(new Map<ID, ClientScore>());

  constructor(backend: DataStorage, rootStore: RootStore) {
    this.backend = backend;
    this.rootStore = rootStore;

    makeObservable(this);
  }

  async init(): Promise<void> {
    try {
      const fetchedScores = await this.backend.fetchScores();
      for (const sp of fetchedScores) {
        const score = new ClientScore(this, sp.id, sp.name, sp.dateCreated, sp.dateModified);
        this.scoreMap.set(score.id, score);
      }
    } catch (err) {
      console.log('Could not load scores', err);
    }
  }

  @action get(id: string): ClientScore | undefined {
    return this.scoreMap.get(id);
  }

  @action getByName(name: string): ClientScore | undefined {
    for (const [, score] of this.scoreMap) {
      if (score.name === name) {
        return score;
      }
    }
    return undefined;
  }

  @computed get scoreList(): readonly ClientScore[] {
    return Array.from(this.scoreMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  }

  @computed get count(): number {
    return this.scoreMap.size;
  }

  @computed get isEmpty(): boolean {
    return this.count === 0;
  }

  @action.bound async createScore(scoreName: string): Promise<ClientScore> {
    const id = generateId();
    const score = new ClientScore(this, id, scoreName, new Date(), new Date());
    this.scoreMap.set(score.id, score);
    await this.backend.createScore(score.serialize());
    return score;
  }

  @action.bound async deleteScore(score: ClientScore): Promise<void> {
    this.scoreMap.delete(score.id);
    score.dispose();
    await this.backend.removeScores([score.id]);
    this.rootStore.fileStore.refetch();
  }

  @action.bound removeFromFiles(files: ClientFile[], score: ClientScore): void {
    files.forEach((f) => f.removeScore(score));
  }

  @action.bound setOnFiles(files: ClientFile[], score: ClientScore, value: number): void {
    files.forEach((f) => f.setScore(score, value));
  }

  save(score: ScoreDTO): void {
    score.dateModified = new Date();
    this.backend.saveScore(score);
  }
}

export default ScoreStore;
