import { PositionSource } from 'position-strings';

export function moveBefore<T extends { id: string; position: string }>(
  list: T[],
  positions: PositionSource,
  source: T,
  target: T,
): boolean {
  const [sourceIndex, targetIndex] = findIndices(list, source, target);
  return move(list, positions, sourceIndex, targetIndex);
}

export function moveAfter<T extends { id: string; position: string }>(
  list: T[],
  positions: PositionSource,
  source: T,
  target: T,
): boolean {
  const [sourceIndex, targetIndex] = findIndices(list, source, target);
  return move(list, positions, sourceIndex, targetIndex + 1);
}

function findIndices<T extends { id: string }>(
  list: T[],
  source: T,
  target: T,
): [sourceIndex: number, targetIndex: number] {
  let sourceIndex = -1;
  let targetIndex = -1;

  for (let index = 0; index < list.length; index++) {
    const item = list[index];

    if (item.id == source.id) {
      sourceIndex = index;
    } else if (item.id === target.id) {
      targetIndex = index;
    }
  }

  if (sourceIndex === -1 || targetIndex === -1) {
    throw new Error();
  }

  return [sourceIndex, targetIndex];
}

/**
 * Moves an item to another index.
 *
 * The item is removed and then inserted between the items at index `to - 1` and `to`
 * (`list[to - 1] < list[from] < list[to]`).
 *
 * @param list A sequence ordered by positions.
 * @param positions The generator for this actor/device from which all positions in the items of list are created from.
 * @param from The index of the moved item. It must be a valid index from 0 to the length of the list (exclusive).
 * @param to The destination index of the item. Values from 0 to the length of the list (inclusive) are valid. It it is
 * the length of the list, it will put the item at the end.
 * @returns Returns false if items are already ordered or indices of source and destination are the same. Otherwise
 * true for a successful move operation.
 */
export function move<T extends { position: string }>(
  list: T[],
  positions: PositionSource,
  from: number,
  to: number,
): boolean {
  if (to - 1 === from || to === from) {
    return false;
  }

  const item = list[from];

  item.position = positions.createBetween(
    to === 0 ? undefined : list.at(to - 1)?.position,
    list.at(to)?.position,
  );

  list.splice(from, 1);
  list.splice(to - Number(from < to), 0, item);

  return true;
}
