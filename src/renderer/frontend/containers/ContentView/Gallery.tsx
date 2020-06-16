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
import GalleryItem from './GalleryItem';
import UiStore, { ViewMethod } from '../../UiStore';
import { ClientFile } from '../../../entities/File';
import IconSet from '../../components/Icons';
import { throttle } from '../../utils';
import { Rectangle } from 'electron';
import ZoomableImage from './ZoomableImage';
import useSelectionCursor from '../../hooks/useSelectionCursor';
import useDebounce from '../../hooks/useDebounce';

// Should be same as CSS variable --thumbnail-size + padding (adding padding, though in px)
const CELL_SIZE_SMALL = 160 - 2;
const CELL_SIZE_MEDIUM = 260 - 2;
const CELL_SIZE_LARGE = 360 - 2;

function getThumbnailSize(sizeType: 'small' | 'medium' | 'large') {
  if (sizeType === 'small') {
    return CELL_SIZE_SMALL;
  } else if (sizeType === 'medium') {
    return CELL_SIZE_MEDIUM;
  }
  return CELL_SIZE_LARGE;
}

interface IGalleryLayoutProps {
  contentRect: Rectangle;
  fileList: ClientFile[];
  uiStore: UiStore;
  handleClick: (file: ClientFile, e: React.MouseEvent) => void;
  handleDoubleClick: (file: ClientFile, e: React.MouseEvent) => void;
  handleDrop: (item: any, file: ClientFile) => void;
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

/** Generates a unique key for an element in the fileList */
const getItemKey = (index: number, data: ClientFile[]): string => {
  const file = index < data.length ? data[index] : null;
  return file ? file.id : `${index}`;
};

const GridGallery = observer(
  ({
    contentRect,
    fileList,
    uiStore,
    handleClick,
    handleDoubleClick,
    handleDrop,
    handleFileSelect,
    lastSelectionIndex,
  }: IGalleryLayoutProps) => {
    const cellSize = getThumbnailSize(uiStore.view.thumbnailSize);

    // Debounce the numColums so it doesn't constantly update when the panel width changes (sidebar toggling or window resize)
    const numColumns = useDebounce(Math.floor(contentRect.width / cellSize), 100);
    const numRows = numColumns > 0 ? Math.ceil(fileList.length / numColumns) : 0;

    const ref = useRef<FixedSizeGrid>(null);

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
    const forceUpdateObj = uiStore.fileSelection.length === 0 ? null : uiStore.fileSelection[0];

    // Scroll to a file when selecting it
    const latestSelectedFile =
      lastSelectionIndex.current &&
      lastSelectionIndex.current < fileList.length &&
      fileList[lastSelectionIndex.current].id;
    useEffect(() => {
      const index = fileList.findIndex((f) => f.id === latestSelectedFile);
      if (latestSelectedFile && index >= 0) {
        handleScrollTo(index);
      }
    }, [latestSelectedFile, handleScrollTo, fileList, forceUpdateObj]);

    // Store what the first item in view is in the UiStore
    const handleScroll = useCallback(
      ({ scrollTop }: GridOnScrollProps) =>
        uiStore.view.setFirstItem(numColumns * Math.round(scrollTop / cellSize)),
      [cellSize, numColumns, uiStore.view],
    );

    // Arrow keys up/down for selecting image in next row
    useEffect(() => {
      const onKeyDown = (e: KeyboardEvent) => {
        let index = lastSelectionIndex.current;
        if (index === undefined) {
          return;
        }
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
            <div style={style} className="galleryItem">
              <GalleryItem
                file={file}
                isSelected={uiStore.fileSelection.includes(file.id)}
                onClick={handleClick}
                onDoubleClick={handleDoubleClick}
                onDrop={handleDrop}
              />
            </div>
          );
        }),
      [handleClick, handleDoubleClick, handleDrop, numColumns, uiStore.fileSelection],
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
        initialScrollTop={Math.round(uiStore.view.firstItem / numColumns) * cellSize || 0} // || 0 for initial load
        ref={ref}
      />
    );
  },
);

const ListGallery = observer(
  ({
    contentRect,
    fileList,
    uiStore,
    handleClick,
    handleDoubleClick,
    handleDrop,
    lastSelectionIndex,
  }: IGalleryLayoutProps) => {
    const cellSize = getThumbnailSize(uiStore.view.thumbnailSize);
    const ref = useRef<FixedSizeList>(null);

    const handleScrollTo = useCallback((i: number) => {
      if (ref.current) {
        ref.current.scrollToItem(i);
      }
    }, []);

    // force an update with an observable obj since no rerender is triggered when a Ref value updates (lastSelectionIndex)
    const forceUpdateObj = uiStore.fileSelection.length === 0 ? null : uiStore.fileSelection[0];

    // Scroll to a file when selecting it
    const latestSelectedFile =
      lastSelectionIndex.current &&
      lastSelectionIndex.current < fileList.length &&
      fileList[lastSelectionIndex.current].id;
    useEffect(() => {
      const index = fileList.findIndex((f) => f.id === latestSelectedFile);
      if (latestSelectedFile && index >= 0) {
        handleScrollTo(index);
      }
    }, [latestSelectedFile, handleScrollTo, fileList, forceUpdateObj]);

    // Store what the first item in view is in the UiStore
    const handleScroll = useCallback(
      ({ scrollOffset }: ListOnScrollProps) =>
        uiStore.view.setFirstItem(Math.round(scrollOffset / cellSize)),
      [cellSize, uiStore.view],
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
                isSelected={uiStore.fileSelection.includes(file.id)}
                onClick={handleClick}
                onDoubleClick={handleDoubleClick}
                onDrop={handleDrop}
                showDetails
              />
            </div>
          );
        }),
      [handleClick, handleDoubleClick, handleDrop, uiStore.fileSelection],
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
        initialScrollOffset={uiStore.view.firstItem * cellSize}
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

const SlideGallery = observer(({ fileList, uiStore, contentRect }: IGalleryLayoutProps) => {
  // Go to the first selected image on load
  useEffect(() => {
    if (uiStore.fileSelection.length > 0) {
      uiStore.view.setFirstItem(fileList.findIndex((f) => f.id === uiStore.fileSelection[0]));
    }
  }, [fileList, uiStore.fileSelection, uiStore.view]);

  // Automatically select the active image, so it is shown in the inspector
  useEffect(() => {
    if (uiStore.view.firstItem < fileList.length) {
      uiStore.selectFile(fileList[uiStore.view.firstItem], true);
    }
  }, [fileList, uiStore, uiStore.view.firstItem]);

  const decrImgIndex = useCallback(
    () => uiStore.view.setFirstItem(Math.max(0, uiStore.view.firstItem - 1)),
    [uiStore.view],
  );
  const incrImgIndex = useCallback(
    () => uiStore.view.setFirstItem(Math.min(uiStore.view.firstItem + 1, fileList.length - 1)),
    [uiStore.view, fileList.length],
  );

  // Detect left/right arrow keys to scroll between images
  const handleUserKeyPress = useCallback(
    (event: KeyboardEvent) => {
      if (event.code === 'ArrowLeft') {
        decrImgIndex();
      } else if (event.code === 'ArrowRight') {
        incrImgIndex();
      } else if (event.code === 'Escape') {
        uiStore.view.disableSlideMode();
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
    if (uiStore.view.firstItem + 1 < fileList.length) {
      const nextImg = new Image();
      nextImg.src = fileList[uiStore.view.firstItem + 1].path;
    }
    if (uiStore.view.firstItem - 1 >= 0) {
      const prevImg = new Image();
      prevImg.src = fileList[uiStore.view.firstItem - 1].path;
    }
  }, [fileList, uiStore.view.firstItem]);

  if (uiStore.view.firstItem >= fileList.length) {
    return <p>No files available</p>;
  }

  const file = fileList[uiStore.view.firstItem];

  return (
    // <ZoomableSlideImage
    <ZoomableImage
      src={file.path}
      contentRect={contentRect}
      prevImage={uiStore.view.firstItem - 1 >= 0 ? decrImgIndex : undefined}
      nextImage={uiStore.view.firstItem + 1 < fileList.length ? incrImgIndex : undefined}
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

  const selectionModeOn = uiStore.fileSelection.length > 0;

  const handleBackgroundClick = useCallback(() => uiStore.clearFileSelection(), [uiStore]);

  const handleDrop = useCallback(
    (item: any, file: ClientFile) => {
      // Add all tags in the context to the targeted file
      const ctx = uiStore.getTagContextItems(item.id);
      const allContextTags = [
        ...ctx.tags.map((t) => t.id),
        ...ctx.collections.flatMap((col) => col.getTagsRecursively()),
      ];
      allContextTags.forEach(file.addTag);
    },
    [uiStore],
  );

  // useComputed to listen to fileSelection changes
  const handleFileSelect = useCallback(
    (selectedFile: ClientFile, selectAdditive: boolean, selectRange: boolean) => {
      const i = fileList.indexOf(selectedFile);
      const isSelected = uiStore.fileSelection.includes(selectedFile.id);
      const isSingleSelected = isSelected && uiStore.fileSelection.length === 1;

      const newSelection = makeSelection(i, selectRange);
      if (!selectAdditive) {
        uiStore.clearFileSelection();
      }
      if (selectRange) {
        uiStore.selectFiles(newSelection.map((i) => fileList[i].id));
      } else {
        // Only select this file. If this is the only selected file, deselect it
        isSingleSelected ? uiStore.deselectFile(selectedFile) : uiStore.selectFile(selectedFile);
      }
    },
    [makeSelection, fileList, uiStore],
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
      uiStore.view.enableSlideMode();
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
        className={`gallery-content thumbnail-${uiStore.view.thumbnailSize} ${
          uiStore.view.method
        } ${selectionModeOn ? 'gallerySelectionMode' : ''} ${
          uiStore.view.thumbnailShape === 'square' ? 'thumb-square' : 'thumb-letterbox'
        }`}
        onClick={handleBackgroundClick}
      >
        {getLayoutComponent(uiStore.view.method, uiStore.view.isSlideMode, {
          contentRect,
          fileList,
          uiStore,
          handleClick: handleItemClick,
          handleDoubleClick,
          handleDrop,
          handleFileSelect,
          lastSelectionIndex,
        })}
      </div>
    </ResizeSensor>
  );
};

export default withRootstore(observer(Gallery));
