import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ResizeSensor, IResizeEntry, NonIdealState, Button, ButtonGroup } from '@blueprintjs/core';
import {
  FixedSizeGrid,
  FixedSizeList,
  GridChildComponentProps,
  ListChildComponentProps,
  GridOnScrollProps,
  ListOnScrollProps,
} from 'react-window';
import { observer, useObserver } from 'mobx-react-lite';

import { withRootstore, IRootStoreProp } from '../../contexts/StoreContext';
import GalleryItem, { MissingImageFallback } from './GalleryItem';
import UiStore, { ViewMethod } from '../../stores/UiStore';
import { ClientFile } from '../../../entities/File';
import IconSet from 'components/Icons';
import { throttle } from '../../utils';
import { Rectangle } from 'electron';
import ZoomableImage from './ZoomableImage';
import useSelectionCursor from '../../hooks/useSelectionCursor';
import useDebounce from '../../hooks/useDebounce';
import FileStore from '../../stores/FileStore';

// WIP > better general thumbsize. See if we kind find better size ratio for different screensize.
// We'll have less loss of space perhaps
// https://stackoverflow.com/questions/57327107/typeerror-cannot-read-property-getprimarydisplay-of-undefined-screen-getprim
// const { screen } = remote;
// const { width } = screen.getPrimaryDisplay().workAreaSize;
// const CELL_SMALL = (width / 10) - 16;
// const CELL_MEDIUM = (width / 6) - 8;
// const CELL_LARGE = (width / 4) - 8;
// // Should be same as CSS variable --thumbnail-size + padding (adding padding, though in px)
// const CELL_SIZE_SMALL = CELL_SMALL - 2;
// const CELL_SIZE_MEDIUM = CELL_MEDIUM - 2;
// const CELL_SIZE_LARGE = CELL_LARGE - 2;
// Should be same as CSS variable --thumbnail-size + padding (adding padding, though in px)
// TODO: Use computed styles to access the CSS variables
const PADDING = 8;
const CELL_SIZE_SMALL = 150 + PADDING;
const CELL_SIZE_MEDIUM = 250 + PADDING;
const CELL_SIZE_LARGE = 350 + PADDING;
// Similar to the flex-shrink CSS property, the thumbnail will shrink, so more
// can fit into one row.
const SHRINK_FACTOR = 0.9;

function getThumbnailSize(sizeType: 'small' | 'medium' | 'large') {
  if (sizeType === 'small') {
    return [CELL_SIZE_SMALL * SHRINK_FACTOR, CELL_SIZE_SMALL];
  } else if (sizeType === 'medium') {
    return [CELL_SIZE_MEDIUM * SHRINK_FACTOR, CELL_SIZE_MEDIUM];
  }
  return [CELL_SIZE_LARGE * SHRINK_FACTOR, CELL_SIZE_LARGE];
}

interface IGalleryLayoutProps {
  contentRect: Rectangle;
  uiStore: UiStore;
  fileStore: FileStore;
  handleClick: (file: ClientFile, e: React.MouseEvent) => void;
  handleDoubleClick: (file: ClientFile, e: React.MouseEvent) => void;
  handleFileSelect: (
    selectedFile: ClientFile,
    selectAdditive: boolean,
    selectRange: boolean,
  ) => void;
  lastSelectionIndex: React.MutableRefObject<number | undefined>;
}

function getLayoutComponent(
  viewMethod: ViewMethod,
  isSlideMode: boolean,
  props: IGalleryLayoutProps,
) {
  if (isSlideMode) {
    return <SlideGallery {...props} />;
  }
  switch (viewMethod) {
    case 'grid':
      return <GridGallery {...props} />;
    // case 'masonry':
    //   return <MasonryGallery {...props} />;
    case 'list':
      return <ListGallery {...props} />;
    default:
      return null;
  }
}

function get_column_layout(width: number, minSize: number, maxSize: number) {
  const numColumns = Math.trunc(width / minSize);
  let cellSize = Math.trunc(width / numColumns);
  if (isNaN(cellSize) || !isFinite(cellSize)) {
    cellSize = minSize;
  }
  cellSize = Math.min(cellSize, maxSize);
  return [numColumns, cellSize];
}

/** Generates a unique key for an element in the fileList */
const getItemKey = (index: number, data: ClientFile[]): string => {
  const file = index < data.length ? data[index] : null;
  return file ? file.id : `${index}`;
};

const GridGallery = observer(
  ({
    contentRect,
    uiStore,
    fileStore,
    handleClick,
    handleDoubleClick,
    handleFileSelect,
    lastSelectionIndex,
  }: IGalleryLayoutProps) => {
    const { fileList } = fileStore;
    const [minSize, maxSize] = getThumbnailSize(uiStore.thumbnailSize);

    // Debounce the numColums so it doesn't constantly update when the panel width changes (sidebar toggling or window resize)
    const [numColumns, cellSize] = useDebounce(
      get_column_layout(contentRect.width, minSize, maxSize),
      50,
    );
    const numRows = numColumns > 0 ? Math.ceil(fileList.length / numColumns) : 0;

    const ref = useRef<FixedSizeGrid>(null);
    const outerRef = useRef<HTMLElement>();

    useEffect(() => {
      if (outerRef.current) {
        outerRef.current.style.setProperty('--thumbnail-size', cellSize - PADDING + 'px');
      }
    }, [cellSize]);

    const handleScrollTo = useCallback(
      (i: number) => {
        if (ref.current) {
          ref.current.scrollToItem({
            rowIndex: Math.floor(i / numColumns),
            columnIndex: 0,
          });
        }
      },
      [numColumns],
    );

    // force an update with an observable obj since no rerender is triggered when a Ref value updates (lastSelectionIndex)
    const forceUpdateObj =
      uiStore.fileSelection.size === 0 ? null : uiStore.getFirstSelectedFileId();

    // Scroll to a file when selecting it
    const latestSelectedFile =
      typeof lastSelectionIndex.current === 'number' &&
      lastSelectionIndex.current < fileList.length &&
      fileList[lastSelectionIndex.current].id;
    useEffect(() => {
      if (latestSelectedFile) {
        const index = fileStore.getIndex(latestSelectedFile);
        if (index !== undefined && index >= 0) {
          handleScrollTo(index);
        }
      }
    }, [latestSelectedFile, handleScrollTo, fileStore, forceUpdateObj]);

    // Store what the first item in view is in the UiStore
    const handleScroll = useCallback(
      ({ scrollTop }: GridOnScrollProps) =>
        uiStore.setFirstItem(numColumns * Math.round(scrollTop / cellSize)),
      [cellSize, numColumns, uiStore],
    );

    // Arrow keys up/down for selecting image in next row
    useEffect(() => {
      const onKeyDown = (e: KeyboardEvent) => {
        // Up and down cursor keys are used in the tag selector list, so ignore these events when it is open
        if (uiStore.isToolbarTagSelectorOpen || lastSelectionIndex.current === undefined) {
          return;
        }

        let index = lastSelectionIndex.current;
        if (e.key === 'ArrowUp' && index >= numColumns) {
          index -= numColumns;
        } else if (
          e.key === 'ArrowDown' &&
          index < fileList.length - 1 &&
          index < fileList.length + numColumns - 1
        ) {
          index = Math.min(index + numColumns, fileList.length - 1);
        } else {
          return;
        }
        handleFileSelect(fileList[index], e.ctrlKey || e.metaKey, e.shiftKey);
      };

      const throttledKeyDown = throttle(onKeyDown, 50);
      window.addEventListener('keydown', throttledKeyDown);
      return () => window.removeEventListener('keydown', throttledKeyDown);
    }, [fileList, uiStore, numColumns, handleFileSelect, lastSelectionIndex]);

    const handleItemKey = useCallback(
      ({ columnIndex, rowIndex, data }) => getItemKey(rowIndex * numColumns + columnIndex, data),
      [numColumns],
    );

    const Cell: React.FunctionComponent<GridChildComponentProps> = useCallback(
      ({ columnIndex, rowIndex, style, data }) =>
        useObserver(() => {
          const itemIndex = rowIndex * numColumns + columnIndex;
          const file = itemIndex < data.length ? data[itemIndex] : null;
          if (!file) {
            return <div />;
          }
          return (
            <div style={style}>
              <GalleryItem
                file={file}
                isSelected={uiStore.fileSelection.has(file.id)}
                onClick={handleClick}
                onDoubleClick={handleDoubleClick}
              />
            </div>
          );
        }),
      [handleClick, handleDoubleClick, numColumns, uiStore.fileSelection],
    );

    return (
      <FixedSizeGrid
        columnCount={numColumns}
        columnWidth={cellSize}
        height={contentRect.height}
        rowCount={numRows}
        rowHeight={cellSize}
        width={contentRect.width}
        itemData={fileList}
        itemKey={handleItemKey}
        overscanRowCount={2}
        children={Cell}
        onScroll={handleScroll}
        initialScrollTop={Math.round(uiStore.firstItem / numColumns) * cellSize || 0} // || 0 for initial load
        ref={ref}
        outerRef={outerRef}
      />
    );
  },
);

const ListGallery = observer(
  ({
    contentRect,
    fileStore,
    uiStore,
    handleClick,
    handleDoubleClick,
    lastSelectionIndex,
  }: IGalleryLayoutProps) => {
    const { fileList } = fileStore;
    const [, cellSize] = getThumbnailSize(uiStore.thumbnailSize);
    const ref = useRef<FixedSizeList>(null);

    const handleScrollTo = useCallback((i: number) => {
      if (ref.current) {
        ref.current.scrollToItem(i);
      }
    }, []);

    // force an update with an observable obj since no rerender is triggered when a Ref value updates (lastSelectionIndex)
    const forceUpdateObj =
      uiStore.fileSelection.size === 0 ? null : uiStore.getFirstSelectedFileId();

    // Scroll to a file when selecting it
    const latestSelectedFile =
      lastSelectionIndex.current &&
      lastSelectionIndex.current < fileList.length &&
      fileList[lastSelectionIndex.current].id;
    useEffect(() => {
      if (latestSelectedFile) {
        const index = fileStore.getIndex(latestSelectedFile);
        if (latestSelectedFile && index !== undefined && index >= 0) {
          handleScrollTo(index);
        }
      }
    }, [latestSelectedFile, handleScrollTo, fileList, forceUpdateObj, fileStore]);

    // Store what the first item in view is in the UiStore
    const handleScroll = useCallback(
      ({ scrollOffset }: ListOnScrollProps) =>
        uiStore.setFirstItem(Math.round(scrollOffset / cellSize)),
      [cellSize, uiStore],
    );

    const Row: React.FunctionComponent<ListChildComponentProps> = useCallback(
      ({ index, style, data }) =>
        useObserver(() => {
          const file = index < data.length ? data[index] : null;
          if (!file) {
            return <div />;
          }
          return (
            <div style={style} className={index % 2 ? 'list-item-even' : 'list-item-uneven'}>
              <GalleryItem
                file={file}
                isSelected={uiStore.fileSelection.has(file.id)}
                onClick={handleClick}
                onDoubleClick={handleDoubleClick}
                showDetails
              />
            </div>
          );
        }),
      [handleClick, handleDoubleClick, uiStore.fileSelection],
    );

    return (
      <FixedSizeList
        height={contentRect.height}
        width={contentRect.width}
        itemSize={cellSize}
        itemCount={fileList.length}
        itemData={fileList}
        itemKey={getItemKey}
        overscanCount={2}
        children={Row}
        onScroll={handleScroll}
        initialScrollOffset={uiStore.firstItem * cellSize}
        ref={ref}
      />
    );
  },
);

export const MasonryGallery = observer(({}: IGalleryLayoutProps) => {
  const Styles: any = {
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: '65%',
  };

  return (
    <div style={Styles}>
      {' '}
      <span className="custom-icon-64" style={{ marginBottom: '1rem' }}>
        {IconSet.DB_ERROR}
      </span>
      <p>This view is currently not supported</p>
    </div>
  );
  {
    /* // tslint:disable-next-line */
  }
});

const SlideGallery = observer(({ fileStore, uiStore, contentRect }: IGalleryLayoutProps) => {
  const { fileList } = fileStore;
  // Go to the first selected image on load
  useEffect(() => {
    if (uiStore.fileSelection.size > 0) {
      const firstSelectedId = uiStore.fileSelection.values().next().value;
      uiStore.setFirstItem(fileStore.getIndex(firstSelectedId));
    }
  }, [fileList, uiStore.fileSelection, uiStore, fileStore]);

  // Automatically select the active image, so it is shown in the inspector
  useEffect(() => {
    if (uiStore.firstItem < fileList.length) {
      uiStore.selectFile(fileList[uiStore.firstItem], true);
    }
  }, [fileList, uiStore]);

  const decrImgIndex = useCallback(() => uiStore.setFirstItem(Math.max(0, uiStore.firstItem - 1)), [
    uiStore,
  ]);
  const incrImgIndex = useCallback(
    () => uiStore.setFirstItem(Math.min(uiStore.firstItem + 1, fileList.length - 1)),
    [uiStore, fileList.length],
  );

  // Detect left/right arrow keys to scroll between images
  const handleUserKeyPress = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft') {
        decrImgIndex();
      } else if (event.key === 'ArrowRight') {
        incrImgIndex();
      } else if (event.key === 'Escape') {
        uiStore.disableSlideMode();
      }
    },
    [incrImgIndex, decrImgIndex, uiStore],
  );

  // Detect scroll wheel to scroll between images
  const handleUserWheel = useCallback(
    (event: WheelEvent) => {
      if (event.ctrlKey) {
        return;
      }
      event.preventDefault();

      if (event.deltaY > 0) {
        decrImgIndex();
      } else if (event.deltaY < 0) {
        incrImgIndex();
      }
    },
    [incrImgIndex, decrImgIndex],
  );

  // Set up event listeners
  useEffect(() => {
    window.addEventListener('keydown', handleUserKeyPress);
    // window.addEventListener('wheel', handleUserWheel, { passive: false });
    return () => {
      window.removeEventListener('keydown', handleUserKeyPress);
      // window.removeEventListener('wheel', handleUserWheel);
    };
  }, [handleUserKeyPress, handleUserWheel]);

  // Preload next and previous image for better UX
  useEffect(() => {
    if (uiStore.firstItem + 1 < fileList.length) {
      const nextImg = new Image();
      nextImg.src = fileList[uiStore.firstItem + 1].absolutePath;
    }
    if (uiStore.firstItem - 1 >= 0) {
      const prevImg = new Image();
      prevImg.src = fileList[uiStore.firstItem - 1].absolutePath;
    }
  }, [fileList, uiStore.firstItem]);

  if (uiStore.firstItem >= fileList.length) {
    return <p>No files available</p>;
  }

  const file = fileList[uiStore.firstItem];

  return file.isBroken ? (
    <MissingImageFallback
      style={{
        width: `${contentRect.width}px`,
        height: `${contentRect.height}px`,
      }}
    />
  ) : (
    <ZoomableImage
      src={file.absolutePath}
      contentRect={contentRect}
      prevImage={uiStore.firstItem - 1 >= 0 ? decrImgIndex : undefined}
      nextImage={uiStore.firstItem + 1 < fileList.length ? incrImgIndex : undefined}
    />
  );
});

const Gallery = ({ rootStore: { uiStore, fileStore } }: IRootStoreProp) => {
  const { fileList } = fileStore;
  const [contentRect, setContentRect] = useState<Rectangle>({ width: 1, height: 1, x: 0, y: 0 });
  const handleResize = useCallback((entries: IResizeEntry[]) => {
    const { contentRect: rect, target } = entries[0];
    setContentRect({
      width: rect.width,
      height: rect.height,
      x: (target as HTMLDivElement).offsetLeft,
      y: (target as HTMLDivElement).offsetTop,
    });
  }, []);

  const { makeSelection, lastSelectionIndex } = useSelectionCursor();

  const handleBackgroundClick = useCallback(() => uiStore.clearFileSelection(), [uiStore]);

  // useComputed to listen to fileSelection changes
  const handleFileSelect = useCallback(
    (selectedFile: ClientFile, selectAdditive: boolean, selectRange: boolean) => {
      const i = fileStore.getIndex(selectedFile.id);
      if (i === undefined) {
        return;
      }

      const isSelected = uiStore.fileSelection.has(selectedFile.id);
      const singleSelected = isSelected && uiStore.fileSelection.size === 1;

      const newSelection = makeSelection(i, selectRange);
      if (!selectAdditive) {
        uiStore.clearFileSelection();
      }
      if (selectRange) {
        uiStore.selectFiles(newSelection.map((i) => fileList[i].id));
      } else if (selectAdditive) {
        // Add or subtract to the selection
        isSelected ? uiStore.deselectFile(selectedFile) : uiStore.selectFile(selectedFile);
      } else {
        // Only select this file. If this is the only selected file, deselect it
        singleSelected ? uiStore.deselectFile(selectedFile) : uiStore.selectFile(selectedFile);
      }
    },
    [fileStore, uiStore, makeSelection, fileList],
  );

  const handleItemClick = useCallback(
    (clickedFile: ClientFile, e: React.MouseEvent) => {
      e.stopPropagation(); // avoid propogation to background
      handleFileSelect(clickedFile, e.ctrlKey || e.metaKey, e.shiftKey);
    },
    [handleFileSelect],
  );

  // Slide view when double clicking
  const handleDoubleClick = useCallback(
    (clickedFile: ClientFile) => {
      uiStore.selectFile(clickedFile, true);
      uiStore.enableSlideMode();
    },
    [uiStore],
  );

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      let index = lastSelectionIndex.current;
      if (index === undefined) {
        return;
      }
      if (e.key === 'ArrowLeft' && index > 0) {
        index -= 1;
      } else if (e.key === 'ArrowRight' && index < fileList.length - 1) {
        index += 1;
      } else {
        return;
      }
      handleFileSelect(fileList[index], e.ctrlKey || e.metaKey, e.shiftKey);
    };

    const throttledKeyDown = throttle(onKeyDown, 50);

    window.addEventListener('keydown', throttledKeyDown);
    return () => window.removeEventListener('keydown', throttledKeyDown);
  }, [fileList, uiStore, handleFileSelect, lastSelectionIndex]);

  // Todo: Select by dragging a rectangle shape
  // Could maybe be accomplished with https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API
  // Also take into account scrolling when dragging while selecting

  if (fileList.length === 0) {
    let icon = <span className="bp3-icon custom-icon custom-icon-64">{IconSet.MEDIA}</span>;
    let title = 'No images';
    let description = 'Images can be added from the outliner';
    let action = (
      <Button onClick={uiStore.toggleOutliner} text="Toggle outliner" intent="primary" />
    );
    if (fileStore.showsQueryContent) {
      description = 'Try searching for something else.';
      icon = <span className="bp3-icon custom-icon custom-icon-64">{IconSet.MEDIA}</span>;
      title = 'No images found';
      action = (
        <ButtonGroup>
          <Button text="All images" icon={IconSet.MEDIA} onClick={fileStore.fetchAllFiles} />
          <Button
            text="Untagged"
            icon={IconSet.TAG_BLANCO}
            onClick={fileStore.fetchUntaggedFiles}
          />
          <Button
            text="Search"
            icon={IconSet.SEARCH}
            onClick={uiStore.openQuickSearch}
            intent="primary"
          />
        </ButtonGroup>
      );
    } else if (fileStore.showsUntaggedContent) {
      icon = <span className="bp3-icon custom-icon custom-icon-64">{IconSet.MEDIA}</span>;
      description = 'All images have been tagged. Nice work!';
      title = 'No untagged images';
      action = (
        <ButtonGroup>
          <Button text="All Images" icon={IconSet.MEDIA} onClick={fileStore.fetchAllFiles} />
          <Button
            text="Search"
            icon={IconSet.SEARCH}
            onClick={uiStore.openQuickSearch}
            intent="primary"
          />
        </ButtonGroup>
      );
    }

    return <NonIdealState icon={icon} title={title} description={description} action={action} />;
  }

  return (
    <ResizeSensor onResize={handleResize}>
      <div
        id="gallery-content"
        className={`thumbnail-${uiStore.thumbnailSize} ${uiStore.method} thumbnail-${uiStore.thumbnailShape}`}
        onClick={handleBackgroundClick}
      >
        {getLayoutComponent(uiStore.method, uiStore.isSlideMode, {
          contentRect,
          fileStore,
          uiStore,
          handleClick: handleItemClick,
          handleDoubleClick,
          handleFileSelect,
          lastSelectionIndex,
        })}
      </div>
    </ResizeSensor>
  );
};

export default withRootstore(observer(Gallery));
