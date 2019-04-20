import React, { useEffect, useCallback, useRef } from 'react';

import { observer } from 'mobx-react-lite';

import { withRootstore, IRootStoreProp } from '../contexts/StoreContext';
import GalleryItem from './GalleryItem';
import { ClientFile } from '../../entities/File';

interface IGalleryProps extends IRootStoreProp {}

const Gallery = ({
  rootStore: {
    uiStore,
    fileStore: { fileList },
  },
}: IGalleryProps) => {
  // Todo: Maybe move these to UiStore so that it can be reset when the fileList changes?
  /** The first item that is selected in a multi-selection */
  const initialSelectionIndex = useRef<number | undefined>(undefined);
  /** The last item that is selected in a multi-selection */
  const lastSelectionIndex = useRef<number | undefined>(undefined);

  const selectionModeOn = uiStore.fileSelection.length > 0;

  const handleBackgroundClick = useCallback(() => uiStore.fileSelection.clear(), []);

  const handleItemClick = useCallback(
    (clickedFile: ClientFile, e: React.MouseEvent) => {
      e.stopPropagation(); // avoid propogation to background

      const i = fileList.indexOf(clickedFile);
      const isSelected = uiStore.fileSelection.includes(clickedFile.id);

      if (e.shiftKey) {
        // Shift selection: Select from the initial up to the current index
        if (initialSelectionIndex.current !== undefined) {
          uiStore.fileSelection.clear();
          // Make sure that sliceStart is the lowest index of the two and vice versa
          let sliceStart = initialSelectionIndex.current;
          let sliceEnd = i;
          if (i < initialSelectionIndex.current) {
            sliceStart = i;
            sliceEnd = initialSelectionIndex.current;
          }
          uiStore.fileSelection.push(
            ...fileList.slice(sliceStart, sliceEnd + 1).map((f) => f.id),
          );
        }
      } else if (e.ctrlKey || e.metaKey) {
        // Ctrl/meta selection: Add this file to selection
        initialSelectionIndex.current = i;
        isSelected ? uiStore.deselectFile(clickedFile) : uiStore.selectFile(clickedFile);
      } else {
        // Normal selection: Only select this file
        // If this is the only selected file, deselect when clicking on it
        const isOnlySelected = isSelected && uiStore.fileSelection.length === 1;
        initialSelectionIndex.current = i;
        uiStore.fileSelection.clear();
        isOnlySelected ? uiStore.deselectFile(clickedFile) : uiStore.selectFile(clickedFile);
      }
      lastSelectionIndex.current = i;
    },
    [],
  );

  useEffect(() => {
    // When an arrow key is pressed, select the item relative to the last selected item
    const onKeyDown = (e: KeyboardEvent) => {
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
        uiStore.fileSelection.clear();
        // Make sure the selection stays in bounds
        const newIndex = Math.max(0, Math.min(fileList.length - 1, lastSelectionIndex.current + indexMod));
        uiStore.selectFile(fileList[newIndex]);
        initialSelectionIndex.current = newIndex;
        lastSelectionIndex.current = newIndex;
        // Todo: Would be nice to scroll automatically to selected image
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  // Todo: Select by dragging a rectangle shape
  // Could maybe be accomplished with https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API
  // Also take into account scrolling when dragging while selecting

  return (
    <div
      className={`${selectionModeOn ? 'gallerySelectionMode' : ''}`}
      onClick={handleBackgroundClick}
    >
      {fileList.map((file) => (
        <GalleryItem
          key={`file-${file.id}`}
          file={file}
          isSelected={uiStore.fileSelection.includes(file.id)}
          onClick={handleItemClick}
        />
      ))}
    </div>
  );
};

export default withRootstore(observer(Gallery));
