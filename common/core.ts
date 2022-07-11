export function clamp(value: number, min: number, max: number): number {
  if (value > max) {
    return max;
  } else if (value < min) {
    return min;
  } else {
    return value;
  }
}

/** Use with care: This modifies the given array! */
export function shuffleArray<T>(array: T[]): T[] {
  for (let i = array.length - 1; i > 0; i--) {
    const rand = Math.floor(Math.random() * (i + 1));
    [array[i], array[rand]] = [array[rand], array[i]];
  }
  return array;
}

/** Retains only the elements specified by the predicate.
 *
 * In other words, remove all elements e such that f(&e) returns false. This method operates in place,
 * visiting each element exactly once in the original order, and preserves the order of the
 * retained elements.
 */
export function retainArray<T>(array: T[], predicate: (element: T, index: number) => boolean) {
  let deleteCount = 0;
  let i = 0;
  const len = array.length;
  while (i !== len) {
    const result = predicate(array[i], i);
    i += 1;
    if (!result) {
      deleteCount = 1;
      break;
    }
  }
  // This will only be executed if deleteCount is greater than 0; thus the check can be
  // omitted when the predicate becomes true.
  while (i !== len) {
    if (!predicate(array[i], i)) {
      deleteCount += 1;
    } else {
      // Move retained element to the beginning of the hole (deleted elements). Doing so will
      // shift the hole to the end of the array.
      const holeSlot = i - deleteCount;
      swap(array, holeSlot, i);
    }
    i += 1;
  }
  array.length = len - deleteCount;
}

export function notEmpty<TValue>(value: TValue): value is NonNullable<TValue> {
  return value !== null && value !== undefined;
}

export function swap<T>(array: Array<T>, x: number, y: number): void {
  [array[x], array[y]] = [array[y], array[x]];
}
