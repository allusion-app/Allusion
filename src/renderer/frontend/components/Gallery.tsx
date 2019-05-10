import React, { useState, useEffect, useCallback } from 'react';
import { ResizeSensor, IResizeEntry } from '@blueprintjs/core';
import { FixedSizeGrid as Grid, GridItemKeySelector } from 'react-window';
import { observer, Observer } from 'mobx-react-lite';

import { withRootstore, IRootStoreProp } from '../contexts/StoreContext';
import GalleryItem from './GalleryItem';

interface IGalleryProps extends IRootStoreProp {}

const Gallery = ({
  rootStore: {
    uiStore,
    fileStore: { fileList },
  },
}: IGalleryProps) => {
  const [contentHeight, setContentHeight] = useState(1); // window.innerWidth
  const [contentWidth, setContentWidth] = useState(1); // window.innerWidth
  const handleResize = useCallback((entries: IResizeEntry[]) => {
    setContentWidth(entries[0].contentRect.width);
    setContentHeight(entries[0].contentRect.height);
  }, []);

  const colWidth = 260; // Should be same as CSS variable $thumbnail-size + padding
  const numColumns = Math.floor(contentWidth / colWidth);
  const numRows = Math.ceil(fileList.length / numColumns);

  /** Generates a unique key for an element in the grid */
  const handleItemKey: GridItemKeySelector = useCallback(
    ({ columnIndex, rowIndex }) => {
      const itemIndex = rowIndex * numColumns + columnIndex;
      const file = itemIndex < fileList.length ? fileList[itemIndex] : null;
      return `${rowIndex}-${columnIndex}-${file ? file.id : ''}`;
  }, []);

  // Todo: Maybe move these to UiStore so that it can be reset when the fileList changes?
  /** The first item that is selected in a multi-selection */
  const [initialSelectionIndex, setInitialSelectionIndex] = useState<
    number | undefined
  >(undefined);
  /** The last item that is selected in a multi-selection */
  const [lastSelectionIndex, setLastSelectionIndex] = useState<
    number | undefined
  >(undefined);

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
      uiStore.selectFile(
        fileList[Math.min(fileList.length - 1, lastSelectionIndex + 1)],
      );
    }
  };

  useEffect(() => {
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  const Cell = useCallback(
    ({ columnIndex, rowIndex, style }) => {
      const itemIndex = rowIndex * numColumns + columnIndex;
      const file = itemIndex < fileList.length ? fileList[itemIndex] : null;
      if (!file) {
        return <div />;
      }
      return (
        <div style={style}>
          {/* Item {itemIndex} ({rowIndex},{columnIndex}) */}
          {/* <img src={file.path} width={colWidth} height={colWidth} /> */}
          {/* <img src={`https://placekitten.com/${colWidth}/${colWidth}`} width={colWidth} height={colWidth} /> */}
          <Observer>
            {() => (
              <GalleryItem
                key={`file-${file.id}`}
                file={file}
                isSelected={uiStore.fileSelection.includes(file.id)}
                onRemoveTag={(tag) => file.removeTag(tag.id)}
                onSelect={(f, e) => onSelect(itemIndex, e)}
                onDeselect={(f) => uiStore.deselectFile(f)}
                onDrop={(tag) => file.addTag(tag.id)}
              />
            )}
          </Observer>
        </div>
      );
    },
    [numColumns],
  );

  return (
    <ResizeSensor onResize={handleResize}>
      <div className={`gallery-content ${selectionModeOn ? 'gallerySelectionMode' : ''}`}>
          <Grid
            columnCount={numColumns}
            columnWidth={colWidth}
            height={contentHeight}
            rowCount={numRows}
            rowHeight={colWidth}
            width={contentWidth}
            itemData={fileList}
            itemKey={handleItemKey}
            overscanRowsCount={2}
          >
            {Cell}
          </Grid>
      </div>
    </ResizeSensor>
  );
};

export default withRootstore(observer(Gallery));
