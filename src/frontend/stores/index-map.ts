import { swap } from 'common/core';
import { computed, createAtom, makeObservable, observable } from 'mobx';

export class IndexMap<K, V> implements Iterable<V> {
  readonly #atom = createAtom('IndexMap');
  readonly #index = new Map<K, number>();
  readonly #invertedIndex = new Array<K>();
  readonly #items = observable.array(new Array<V>());

  constructor() {
    makeObservable(this);
  }

  static from<K, V>(entries: Iterable<[K, V]>): IndexMap<K, V> {
    const indexMap = new IndexMap<K, V>();
    let index = 0;

    for (const [key, value] of entries) {
      indexMap.#index.set(key, index);
      indexMap.#invertedIndex.push(key);
      indexMap.#items.push(value);

      index += 1;
    }

    return indexMap;
  }

  [Symbol.iterator](): Iterator<V> {
    return this.#items[Symbol.iterator]();
  }

  get size(): number {
    return this.#items.length;
  }

  @computed
  get isEmpty(): boolean {
    return this.#items.length <= 0;
  }

  has(key: K): boolean {
    return this.#index.has(key);
  }

  get(key: K): V | undefined {
    const index = this.#index.get(key);

    if (index !== undefined) {
      return this.#items[index];
    } else {
      return undefined;
    }
  }

  at(index: number): V | undefined {
    return this.#items.at(index);
  }

  slice(start: number = 0, end?: number): readonly V[] {
    return this.#items.slice(start, end);
  }

  getIndex(key: K): number | undefined {
    return this.#index.get(key);
  }

  keys(): readonly Readonly<K>[] {
    return this.#invertedIndex;
  }

  values(): readonly V[] {
    return this.#items;
  }

  observe(): void {
    if (!this.#atom.reportObserved()) {
      console.warn('Reading IndexMap outside a reactive context.');
    }
  }

  insert(key: K, value: V): V | undefined {
    this.#atom.reportChanged();

    const index = this.#index.get(key);

    if (index !== undefined) {
      return this.#items.splice(index, 1, value)[0];
    } else {
      this.#index.set(key, this.size);
      this.#invertedIndex.push(key);
      this.#items.push(value);
      return undefined;
    }
  }

  insertSort(entries: Iterable<[key: K, merge: (currentValue: V | undefined) => V]>): V[] {
    let currentIndex = 0;

    for (const [key, merge] of entries) {
      let index = this.#index.get(key);

      if (index !== undefined) {
        merge(this.#items[index]);
      } else {
        index = this.size;
        this.#index.set(key, index);
        this.#invertedIndex.push(key);
        this.#items.push(merge(undefined));
      }

      if (index != currentIndex) {
        const currentKey = this.#invertedIndex[currentIndex];

        this.#index.set(currentKey, index);
        this.#index.set(key, currentIndex);
        swap(this.#invertedIndex, index, currentIndex);
        swap(this.#items, index, currentIndex);
      }

      currentIndex += 1;
    }

    if (currentIndex > 0) {
      this.#atom.reportChanged();
    }

    return this.splitOff(currentIndex);
  }

  delete(key: K): V | undefined {
    const index = this.#index.get(key);

    if (index !== undefined) {
      this.#atom.reportChanged();

      this.#index.delete(key);
      this.#invertedIndex.splice(index, 1);

      for (let i = index; i < this.size; i++) {
        const key = this.#invertedIndex[i];
        this.#index.set(key, i);
      }

      return this.#items.splice(index, 1)[0];
    } else {
      return undefined;
    }
  }

  splice(start: number = 0, deleteCount: number = 0, ...entries: Array<[K, V]>): V[] {
    if (start >= this.size) {
      return [];
    }

    this.#atom.reportChanged();

    for (const key of this.#invertedIndex.splice(
      start,
      deleteCount,
      ...entries.map(([key]) => key),
    )) {
      this.#index.delete(key);
    }

    for (let i = start; i < this.size; i++) {
      const key = this.#invertedIndex[i];
      this.#index.set(key, i);
    }

    return this.#items.splice(start, deleteCount, ...entries.map(([, value]) => value));
  }

  retain(predicate: (value: V) => boolean): V[] {
    let deleteCount = 0;
    let i = 0;
    const len = this.size;

    while (i !== len) {
      const result = predicate(this.#items[i]);
      i += 1;
      if (!result) {
        deleteCount = 1;
        break;
      }
    }
    // This will only be executed if deleteCount is greater than 0; thus the check can be
    // omitted when the predicate becomes true.
    while (i !== len) {
      if (!predicate(this.#items[i])) {
        deleteCount += 1;
      } else {
        // Move retained element to the beginning of the hole (deleted elements). Doing so will
        // shift the hole to the end of the array.
        const holeSlot = i - deleteCount;
        swap(this.#items, holeSlot, i);
        swap(this.#invertedIndex, holeSlot, i);
      }
      i += 1;
    }

    return this.splitOff(len - deleteCount);
  }

  splitOff(at: number): V[] {
    if (at >= this.size) {
      return [];
    }

    this.#atom.reportChanged();

    for (const key of this.#invertedIndex.splice(at)) {
      this.#index.delete(key);
    }

    return this.#items.splice(at);
  }

  clear(): void {
    if (this.size > 0) {
      this.#atom.reportChanged();
      this.#index.clear();
      this.#invertedIndex.length = 0;
      this.#items.length = 0;
    }
  }
}