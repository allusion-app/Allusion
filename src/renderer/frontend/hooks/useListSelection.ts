import { useRef, useCallback } from 'react';
import { IIdentifiable, ID } from '../../entities/ID';
import { throttle } from '../utils';

export default function useListSelection<T extends IIdentifiable & { isSelected: boolean }>(
  itemList: T[],
  selectionList: ID[],
  onSelect: (item: T | T[]) => void,
  onDeselect: (item: T | T[]) => void,
  onClearSelection: () => void,
) {
  /** The first item that is selected in a multi-selection */
  const initialSelectionIndex = useRef<number | undefined>(undefined);
  /** The last item that is selected in a multi-selection */
  const lastSelectionIndex = useRef<number | undefined>(undefined);

  // Move selection logic to a custom hook
  const handleItemClick = useCallback(
    (clickedItem: T, e: React.MouseEvent) => {
      e.stopPropagation(); // avoid propogation to background

      const i = itemList.indexOf(clickedItem);
      const isSelected = clickedItem.isSelected;

      if (e.shiftKey) {
        // Shift selection: Select from the initial up to the current index
        if (initialSelectionIndex.current !== undefined) {
          onClearSelection();
          // Make sure that sliceStart is the lowest index of the two and vice versa
          let sliceStart = initialSelectionIndex.current;
          let sliceEnd = i;
          if (i < initialSelectionIndex.current) {
            sliceStart = i;
            sliceEnd = initialSelectionIndex.current;
          }
          onSelect(itemList.slice(sliceStart, sliceEnd + 1));
        }
      } else if (e.ctrlKey || e.metaKey) {
        // Ctrl/meta selection: Add this file to selection
        initialSelectionIndex.current = i;
        isSelected ? onSelect(clickedItem) : onDeselect(clickedItem);
      } else {
        // Normal selection: Only select this file
        // If this is the only selected file, deselect when clicking on it
        const isOnlySelected = isSelected && selectionList.length === 1;
        initialSelectionIndex.current = i;
        onClearSelection();
        isOnlySelected ? onDeselect(clickedItem) : onSelect(clickedItem);
      }
      lastSelectionIndex.current = i;
    },
    [],
  );

  // When an arrow key is pressed, select the item relative to the last selected item
  const handleContainerKeyboardEvent: (e: KeyboardEvent) => void = useCallback(
    throttle((e: KeyboardEvent) => {
      if (lastSelectionIndex.current === undefined) { // no selection => do nothing
        return undefined;
      }
      let indexMod = 0;
      if (e.key === 'ArrowLeft') {
        indexMod -= 1;
      } else if (e.key === 'ArrowRight') {
        indexMod += 1;
      }
      if (indexMod !== 0) {
        onClearSelection();
        // Make sure the selection stays in bounds
        const newIndex = Math.max(0, Math.min(itemList.length - 1, lastSelectionIndex.current + indexMod));
        onSelect(itemList[newIndex]);
        initialSelectionIndex.current = newIndex;
        lastSelectionIndex.current = newIndex;
      }
    },
    50),
  []);

  return [handleItemClick, handleContainerKeyboardEvent];
}
