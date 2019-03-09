import React, { useMemo, useState, useEffect } from 'react';

import { observer } from 'mobx-react-lite';

import { withRootstore } from '../contexts/StoreContext';
import RootStore from '../stores/RootStore';
import GalleryItem from './GalleryItem';
import { ClientFile } from '../../entities/File';
import { ClientTag } from '../../entities/Tag';

interface IGalleryProps {
  rootStore: RootStore;
}

const Gallery = ({
  rootStore: {
    uiStore,
    fileStore: {
      fileList,
    },
  },
}: IGalleryProps) => {
  // Todo: Maybe move these to UiStore so that it can be reset when the fileList changes?
  /** The first item that is selected in a multi-selection */
  const [initialSelectionIndex, setInitialSelectionIndex] = useState<number>(undefined);
  /** The last item that is selected in a multi-selection */
  const [lastSelectionIndex, setLastSelectionIndex] = useState<number>(undefined);

  const selectionModeOn = uiStore.fileSelection.length > 0;

  const onSelect = (i: number, e: React.MouseEvent) => {
    if (e.shiftKey) {
      // Shift selection: Select from the initial up to the current index
      if (initialSelectionIndex >= 0) {
        uiStore.fileSelection.clear();
        // Make sure that sliceStart is the lowest index of the two and vice versa
        let sliceStart = initialSelectionIndex;
        let sliceEnd = i;
        if (i < initialSelectionIndex) {
          sliceStart = i;
          sliceEnd = initialSelectionIndex;
        }
        uiStore.fileSelection.push(...fileList.slice(sliceStart, sliceEnd + 1).map((f) => f.id));
      }
    } else {
      // Normal selection: Add this file to the selection
      setInitialSelectionIndex(i);
      uiStore.fileSelection.push(fileList[i].id);
    }
    setLastSelectionIndex(i);
    console.log(lastSelectionIndex);
  };

  const onKeyDown = (e: KeyboardEvent) => {
    // When an arrow key is pressed, select the item relative to the last selected item
    console.log(e, lastSelectionIndex);
    if (lastSelectionIndex === undefined) {
      return;
    }
    if (e.key === 'ArrowLeft') {
      uiStore.fileSelection.clear();
      uiStore.selectFile(fileList[Math.max(0, lastSelectionIndex - 1)]);
    } else if (e.key === 'ArrowRight') {
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
