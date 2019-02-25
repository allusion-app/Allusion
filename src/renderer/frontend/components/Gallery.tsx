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

  // Todo: Maybe move to UiStore so that it can be reset when the fileList changes?
  const [initialSelectionIndex, setInitialSelectionIndex] = useState<number>(undefined);

  const selectionModeOn = uiStore.fileSelection.length > 0;

  const onSelect = (i: number, e: React.MouseEvent) => {
    if (e.shiftKey) {
      // Shift selection: Select from the initial up to the current index
      if (initialSelectionIndex >= 0) {
        uiStore.fileSelection.clear();
        let sliceStart = initialSelectionIndex;
        let sliceEnd = i;
        if (i < initialSelectionIndex) {
          sliceStart = i;
          sliceEnd = initialSelectionIndex;
        }
        uiStore.fileSelection.push(...fileList.slice(sliceStart, sliceEnd + 1).map((f) => f.id));
      }
    } else {
      setInitialSelectionIndex(i);
      uiStore.fileSelection.push(fileList[i].id);
    }
  };

  const onKeyDown = (e: KeyboardEvent) => {
    const openedFileIndex = fileList.indexOf(fileList.find((f) => f.id === uiStore.openedFile));
    if (openedFileIndex === -1) {
      return;
    }
    if (e.key === 'ArrowLeft') {
      uiStore.openFile(fileList[Math.max(0, openedFileIndex - 1)]);
    } else if (e.key === 'ArrowRight') {
      uiStore.openFile(fileList[Math.min(fileList.length - 1, openedFileIndex + 1)]);
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
            isOpen={uiStore.openedFile === file.id}
            onRemoveTag={(tag) => file.removeTag(tag.id)}
            onSelect={(f, e) => onSelect(fileIndex, e)}
            onOpen={(f) => selectionModeOn ? uiStore.selectFile(f) : uiStore.openFile(f)}
            onDeselect={(f) => uiStore.deselectFile(f)}
            onDrop={(tag) => file.addTag(tag.id)}
            selectionMode={selectionModeOn}
          />
        ))
      }
    </div>
  );
};

export default withRootstore(observer(Gallery));
