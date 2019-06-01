import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ResizeSensor, IResizeEntry } from '@blueprintjs/core';
import {
  FixedSizeGrid, GridItemKeySelector, FixedSizeList, ListItemKeySelector,
  GridChildComponentProps, ListChildComponentProps,
} from 'react-window';
import { observer, Observer } from 'mobx-react-lite';

import { withRootstore, IRootStoreProp } from '../contexts/StoreContext';
import GalleryItem from './GalleryItem';
import UiStore, { ViewMethod } from '../stores/UiStore';
import { ClientFile } from '../../entities/File';
import { ClientTag } from '../../entities/Tag';

const cellSize = 260; // Should be same as CSS variable $thumbnail-size + padding

interface IGalleryLayoutProps {
  contentWidth: number;
  contentHeight: number;
  fileList: ClientFile[];
  uiStore: UiStore;
  handleClick: (file: ClientFile, e: React.MouseEvent) => void;
  handleDrop: (item: any, file: ClientFile) => void;
}

function getLayoutComponent(viewMethod: ViewMethod, props: IGalleryLayoutProps) {
  switch (viewMethod) {
    case 'grid':
      return <GridGallery {...props} />;
    case 'mason':
      return <MasonryGallery {...props} />;
    case 'list':
      return <ListGallery {...props} />;
    case 'slide':
      return <SlideGallery {...props} />;
    default:
      return null;
  }
}

const GridGallery = observer(
  ({ contentWidth, contentHeight, fileList, uiStore, handleClick, handleDrop }: IGalleryLayoutProps) => {
  const numColumns = Math.floor(contentWidth / cellSize);
  const numRows = numColumns > 0 ? Math.ceil(fileList.length / numColumns) : 0;

  /** Generates a unique key for an element in the grid */
  const handleItemKey: GridItemKeySelector = useCallback(
    ({ columnIndex, rowIndex }) => {
      const itemIndex = rowIndex * numColumns + columnIndex;
      const file = itemIndex < fileList.length ? fileList[itemIndex] : null;
      return `${rowIndex}-${columnIndex}-${file ? file.id : ''}`;
  }, []);

  const Cell: React.FunctionComponent<GridChildComponentProps> = useCallback(
    ({ columnIndex, rowIndex, style, isScrolling }) => {
      const itemIndex = rowIndex * numColumns + columnIndex;
      const file = itemIndex < fileList.length ? fileList[itemIndex] : null;
      if (!file) {
        return <div />;
      }
      // if (isScrolling) return <div style={style}><p>Scrolling...</p></div>; // This prevent image from loading while scrolling
      return (
        <div style={style} key={`file-${file.id}`}>
          {/* Item {itemIndex} ({rowIndex},{columnIndex}) */}
          {/* <img src={file.path} width={colWidth} height={colWidth} /> */}
          {/* <img src={`https://placekitten.com/${colWidth}/${colWidth}`} width={colWidth} height={colWidth} /> */}
          <Observer>
            {() => (
              <GalleryItem
                file={file}
                isSelected={uiStore.fileSelection.includes(file.id)}
                onClick={handleClick}
                onDrop={handleDrop}
                showTags
              />
            )}
          </Observer>
        </div>
      );
    },
    [numColumns],
  );
  return (
    <FixedSizeGrid
      columnCount={numColumns}
      columnWidth={cellSize}
      height={contentHeight}
      rowCount={numRows}
      rowHeight={cellSize}
      width={contentWidth}
      itemData={fileList}
      itemKey={handleItemKey}
      overscanRowsCount={2}
      children={Cell}
      useIsScrolling
      key={fileList.length > 0 ? `${fileList.length}-${fileList[0].id}-${fileList[fileList.length - 1].id}` : ''} // force rerender when file list changes
    />
  );
});

const ListGallery = observer(
  ({ contentWidth, contentHeight, fileList, uiStore, handleClick, handleDrop }: IGalleryLayoutProps) => {
  /** Generates a unique key for an element in the grid */
  const handleItemKey: ListItemKeySelector = useCallback(
    (index) => {
      const file = index < fileList.length ? fileList[index] : null;
      return `${index}-${file ? file.id : ''}`;
  }, []);

  const Row: React.FunctionComponent<ListChildComponentProps> = useCallback(
    ({ index, style }) => {
      const file = index < fileList.length ? fileList[index] : null;
      if (!file) {
        return <div />;
      }
      return (
        <div style={style}>
          <Observer>
            {() => (
              <GalleryItem
                file={file}
                isSelected={uiStore.fileSelection.includes(file.id)}
                onClick={handleClick}
                onDrop={handleDrop}
                showInfo
                showName
                showTags
              />
            )}
          </Observer>
        </div>
      );
    },
    [],
  );

  return (
    <FixedSizeList
      height={contentHeight}
      width={contentWidth}
      itemSize={cellSize}
      itemCount={fileList.length}
      itemKey={handleItemKey}
      overscanCount={2}
      children={Row}
      useIsScrolling
      key={fileList.length > 0 ? `${fileList.length}-${fileList[0].id}-${fileList[fileList.length - 1].id}` : ''} // force rerender when file list changes
    />
  );
});

const MasonryGallery = observer(({ }: IGalleryLayoutProps) => {
  return <p>This view is currently not supported :(</p>;
});

const SlideGallery = observer(({ contentWidth, contentHeight, fileList, uiStore, handleClick, handleDrop }: IGalleryLayoutProps) => {
  // Store which image is currently shown
  // Todo: This could be stored in the UiStore so that the image can be kept in focus when switching between view methods
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  const incrActiveImgIndex = useCallback(
    () => setActiveImageIndex(Math.max(0, activeImageIndex - 1)),
    [activeImageIndex]);
  const decrActiveImgIndex = useCallback(
    () => setActiveImageIndex(Math.min(activeImageIndex + 1, fileList.length - 1)),
    [fileList.length, activeImageIndex]);

  // Detect left/right arrow keys to scroll between images
  const handleUserKeyPress = useCallback((event) => {
    const { keyCode } = event;
    if (keyCode === 37) {
      incrActiveImgIndex();
    } else if (keyCode === 39) {
      decrActiveImgIndex();
    }
  }, [incrActiveImgIndex, decrActiveImgIndex]);

  // Detect scroll wheel to scroll between images
  const handleUserWheel = useCallback((event) => {
    const { deltaY } = event;
    event.preventDefault();
    if (deltaY > 0) {
      decrActiveImgIndex();
    } else if (deltaY < 0) {
      incrActiveImgIndex();
    }
  }, [incrActiveImgIndex, decrActiveImgIndex]);

  // Set up event listeners
  useEffect(() => {
    window.addEventListener('keydown', handleUserKeyPress);
    window.addEventListener('wheel', handleUserWheel);
    return () => {
      window.removeEventListener('keydown', handleUserKeyPress);
      window.removeEventListener('wheel', handleUserWheel);
    };
  }, [handleUserKeyPress, handleUserWheel]);

  // When the file list changes, reset active index
  useEffect(() => {
    setActiveImageIndex(0);
  }, [fileList.length]);

  // Automatically select the active image, so it is shown in the inspector
  useEffect(() => {
    if (activeImageIndex < fileList.length) {
      uiStore.deselectAllFiles();
      uiStore.selectFile(fileList[activeImageIndex]);
    }
  }, [activeImageIndex]);

  if (activeImageIndex >= fileList.length) {
    return <p>No files available</p>;
  }

  const file = fileList[activeImageIndex];

  return (
    <GalleryItem
      file={file}
      isSelected={false /** Active image is always selected, no need to show it */}
      onClick={handleClick}
      onDrop={handleDrop}
    />
  );
});

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

  // Todo: Maybe move these to UiStore so that it can be reset when the fileList changes?
  /** The first item that is selected in a multi-selection */
  const initialSelectionIndex = useRef<number | undefined>(undefined);
  /** The last item that is selected in a multi-selection */
  const lastSelectionIndex = useRef<number | undefined>(undefined);

  const selectionModeOn = uiStore.fileSelection.length > 0;

  const handleBackgroundClick = useCallback(() => uiStore.fileSelection.clear(), []);

  const handleDrop = useCallback(
    (item: any, file: ClientFile) => (item instanceof ClientTag) && file.addTag(item.id), []);

  // Todo: Move selection logic to a custom hook
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
    <ResizeSensor onResize={handleResize}>
      <div
        className={`gallery-content ${uiStore.viewMethod} ${selectionModeOn ? 'gallerySelectionMode' : ''}`}
        onClick={handleBackgroundClick}
      >
        {getLayoutComponent(
          uiStore.viewMethod,
          { contentWidth, contentHeight, fileList, uiStore, handleClick: handleItemClick, handleDrop },
        )}
      </div>
    </ResizeSensor>
  );
};

export default withRootstore(observer(Gallery));
