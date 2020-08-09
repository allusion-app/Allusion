import { useRef, useCallback } from 'react';

function getRange(from: number, to: number) {
  const list = [];
  for (let i = from; i <= to; i++) {
    list.push(i);
  }
  return list;
}

// An invisible cursor that remembers your last selection state,
// which can be used to expand the current selection with shift or ctrl
export default function useSelectionCursor() {
  // Todo: Maybe move these to UiStore so that it can be reset when the fileList changes?
  /** The first item that is selected in a multi-selection */
  const initialSelectionIndex = useRef<number | undefined>(undefined);
  /** The last item that is selected in a multi-selection */
  const lastSelectionIndex = useRef<number | undefined>(undefined);

  const makeSelection = useCallback((i: number, selectRange: boolean): number[] => {
    if (lastSelectionIndex.current === undefined || lastSelectionIndex.current === i) {
      initialSelectionIndex.current = i;
      lastSelectionIndex.current = i;
      return [];
    }

    lastSelectionIndex.current = i;
    if (initialSelectionIndex.current !== undefined && selectRange) {
      if (initialSelectionIndex.current <= i) {
        return getRange(initialSelectionIndex.current, i);
      } else {
        return getRange(i, initialSelectionIndex.current);
      }
    } else {
      initialSelectionIndex.current = i;
      return [i];
    }
  }, []);

  return { makeSelection, lastSelectionIndex };
}
