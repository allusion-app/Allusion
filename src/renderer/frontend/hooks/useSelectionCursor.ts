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
    let newSelection: number[] = [];
    if (lastSelectionIndex.current === undefined || lastSelectionIndex.current === i) {
      // no selection or same selection => do nothing
      initialSelectionIndex.current = i;
    } else {
      // Else, select based on initial/last selection indices
      newSelection = [i];

      if (selectRange) {
        if (initialSelectionIndex.current !== undefined) {
          let sliceStart = initialSelectionIndex.current;
          let sliceEnd = i;
          if (i < initialSelectionIndex.current) {
            sliceStart = i;
            sliceEnd = initialSelectionIndex.current;
          }
          newSelection = getRange(sliceStart, sliceEnd);
        }
      } else {
        initialSelectionIndex.current = i;
      }
    }
    lastSelectionIndex.current = i;
    return newSelection;
  }, []);

  return { makeSelection, lastSelectionIndex };
}
