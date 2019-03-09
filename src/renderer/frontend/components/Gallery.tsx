import React, { useState, useEffect } from 'react';

import { observer } from 'mobx-react-lite';

import { withRootstore, IRootStoreProp } from '../contexts/StoreContext';
import GalleryItem from './GalleryItem';

interface IGalleryProps extends IRootStoreProp {}

const Gallery = ({
  rootStore: {
    uiStore,
    fileStore: { fileList },
  },
}: IGalleryProps) => {
  // Todo: Maybe move these to UiStore so that it can be reset when the fileList changes?
  /** The first item that is selected in a multi-selection */
  const [initialSelectionIndex, setInitialSelectionIndex] = useState<number | undefined>(undefined);
  /** The last item that is selected in a multi-selection */
  const [lastSelectionIndex, setLastSelectionIndex] = useState<number | undefined>(undefined);

  const selectionModeOn = uiStore.fileSelection.length > 0;

  const onSelect = (i: number, e: React.MouseEvent) => {
    if (e.shiftKey) {
      // Shift selection: Select from the initial up to the current index
      if (initialSelectionIndex !== undefined) {
        uiStore.fileSelection.clear();
        // Make sure that sliceStart is the lowest index of the two and vice versa
        let sliceStart = initialSelectionIndex;
        let sliceEnd = i;
        if (i < initialSelectionIndex) {
          sliceStart = i;
          sliceEnd = initialSelectionIndex;
        }
        uiStore.fileSelection.push(...fileList.slice(sliceStart, sliceEnd + 1)
          .map((f) => f.id));
      }
    } else if (e.ctrlKey || e.metaKey) {
      // Ctrl/meta selection: Add this file to selection
      setInitialSelectionIndex(i);
      uiStore.fileSelection.push(fileList[i].id);
    } else {
      // Normal selection: Only select this file
      setInitialSelectionIndex(i);
      uiStore.fileSelection.clear();
      uiStore.fileSelection.push(fileList[i].id);
    }
    setLastSelectionIndex(i);
  };

  const onKeyDown = (e: KeyboardEvent) => {
    // When an arrow key is pressed, select the item relative to the last selected item
    // Fixme: For some reason, the state is not updated here (lastSelectionIndex is always undefined)
    // console.log(e, lastSelectionIndex);
    if (lastSelectionIndex === undefined) {
      return;
    }
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      uiStore.fileSelection.clear();
      uiStore.selectFile(fileList[Math.max(0, lastSelectionIndex - 1)]);
    } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      uiStore.fileSelection.clear();
      uiStore.selectFile(fileList[Math.min(fileList.length - 1, lastSelectionIndex + 1)]);
    }
  };

  useEffect(() => {
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  return (
    <div className={`${selectionModeOn ? 'gallerySelectionMode' : ''}`}>
      {
        fileList.map((file, fileIndex) => (
          <GalleryItem
            key={`file-${file.id}`}
            file={file}
            isSelected={uiStore.fileSelection.includes(file.id)}
            onRemoveTag={(tag) => file.removeTag(tag.id)}
            onSelect={(f, e) => onSelect(fileIndex, e)}
            onDeselect={(f) => uiStore.deselectFile(f)}
            onDrop={(tag) => file.addTag(tag.id)}
          />
        ))
      }
    </div>
  );
};

export default withRootstore(observer(Gallery));
