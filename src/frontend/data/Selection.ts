import { computed, makeObservable, observable } from 'mobx';

export class Selection<T> implements Iterable<T> {
  /** The first item that is selected in a multi-selection. */
  public initialSelection: number | undefined = undefined;
  /** The last item that is selected in a multi-selection. */
  public lastSelection: number | undefined = undefined;
  private readonly items = observable.set(new Set<T>());

  constructor() {
    makeObservable(this);
  }

  [Symbol.iterator](): Iterator<T, any, undefined> {
    return this.items[Symbol.iterator]();
  }

  public has(item: T): boolean {
    return this.items.has(item);
  }

  public get size(): number {
    return this.items.size;
  }

  @computed
  public get isEmpty(): boolean {
    return this.items.size === 0;
  }

  public select(...items: T[]): void {
    this.items.replace(items);
  }

  public selectAdditive(...items: T[]): void {
    for (const item of items) {
      this.items.add(item);
    }
  }

  public deselect(...items: T[]): void {
    for (const item of items) {
      this.items.delete(item);
    }
  }

  public toggle(item: T): void {
    if (this.has(item)) {
      this.items.delete(item);
    } else {
      this.items.clear();
      this.items.add(item);
    }
  }

  public toggleAdditive(item: T): void {
    if (this.has(item)) {
      this.items.delete(item);
    } else {
      this.items.add(item);
    }
  }

  public clear() {
    this.items.clear();
  }
}
