import React, { useState, useEffect, useCallback, useRef, useContext } from 'react';
import { FixedSizeList, ListOnScrollProps } from 'react-window';
import { observer } from 'mobx-react-lite';

import StoreContext from '../../contexts/StoreContext';
import GalleryItem, { MissingImageFallback } from './GalleryItem';
import { ViewMethod } from '../../stores/UiStore';
import { ClientFile } from '../../../entities/File';
import { IconSet } from 'components';
import { ContextMenu, SubMenu, Menu, MenuDivider } from 'components/menu';
import { throttle } from '../../utils';
import { Rectangle } from 'electron';
import ZoomableImage from './ZoomableImage';
import useSelectionCursor from '../../hooks/useSelectionCursor';
import { LayoutMenuItems, SortMenuItems } from '../Toolbar/ContentToolbar';
import useContextMenu from '../../hooks/useContextMenu';
import Placeholder from './Placeholder';

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
const CELL_SIZE_SMALL = 160 + PADDING;
const CELL_SIZE_MEDIUM = 240 + PADDING;
const CELL_SIZE_LARGE = 320 + PADDING;
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
  select: (file: ClientFile, selectAdditive: boolean, selectRange: boolean) => void;
  lastSelectionIndex: React.MutableRefObject<number | undefined>;
  /** menu: [fileMenu, externalMenu] */
  showContextMenu: (x: number, y: number, menu: [JSX.Element, JSX.Element]) => void;
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

function get_column_layout(width: number, minSize: number, maxSize: number): [number, number] {
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
  ({ contentRect, select, lastSelectionIndex, showContextMenu }: IGalleryLayoutProps) => {
    const { fileStore, uiStore } = useContext(StoreContext);
    const { fileList } = fileStore;
    const [minSize, maxSize] = getThumbnailSize(uiStore.thumbnailSize);
    const [[numColumns, cellSize], setDimensions] = useState([0, 0]);

    useEffect(() => {
      const timeoutID = setTimeout(() => {
        setDimensions(get_column_layout(contentRect.width, minSize, maxSize));
      }, 50);

      return () => {
        clearTimeout(timeoutID);
      };
    }, [contentRect.width, maxSize, minSize]);

    const numRows = numColumns > 0 ? Math.ceil(fileList.length / numColumns) : 0;

    const ref = useRef<FixedSizeList>(null);
    const outerRef = useRef<HTMLElement>();

    useEffect(() => {
      if (outerRef.current) {
        outerRef.current.style.setProperty('--thumbnail-size', cellSize - PADDING + 'px');
      }
    }, [cellSize]);

    const handleScrollTo = useCallback(
      (i: number) => {
        if (ref.current) {
          ref.current.scrollToItem(Math.floor(i / numColumns));
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
      ({ scrollOffset }: ListOnScrollProps) =>
        uiStore.setFirstItem(numColumns * Math.round(scrollOffset / cellSize)),
      [cellSize, numColumns, uiStore],
    );

    // Arrow keys up/down for selecting image in next row
    useEffect(() => {
      const onKeyDown = (e: KeyboardEvent) => {
        // Up and down cursor keys are used in the tag selector list, so ignore these events when it is open
        if (lastSelectionIndex.current === undefined) {
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
        select(fileList[index], e.ctrlKey || e.metaKey, e.shiftKey);
      };

      const throttledKeyDown = throttle(onKeyDown, 50);
      window.addEventListener('keydown', throttledKeyDown);
      return () => window.removeEventListener('keydown', throttledKeyDown);
    }, [fileList, uiStore, numColumns, select, lastSelectionIndex]);

    const Row = useCallback(
      ({ index, style, data }) => {
        const offset = index * numColumns;
        return (
          <div role="row" aria-rowindex={index + 1} style={style}>
            {data.slice(offset, offset + numColumns).map((file: ClientFile) => (
              <GalleryItem
                key={file.id}
                file={file}
                select={select}
                showContextMenu={showContextMenu}
              />
            ))}
          </div>
        );
      },
      [select, numColumns, showContextMenu],
    );

    return (
      <div className="grid" role="grid" aria-rowcount={numRows} aria-colcount={numColumns}>
        <FixedSizeList
          height={contentRect.height}
          width={contentRect.width}
          itemSize={cellSize}
          itemCount={numRows}
          itemData={fileList}
          itemKey={getItemKey}
          overscanCount={2}
          children={Row}
          onScroll={handleScroll}
          initialScrollOffset={Math.round(uiStore.firstItem / numColumns) * cellSize || 0} // || 0 for initial load
          ref={ref}
          outerRef={outerRef}
        />
      </div>
    );
  },
);

const ListGallery = observer(
  ({ contentRect, select, lastSelectionIndex, showContextMenu }: IGalleryLayoutProps) => {
    const { fileStore, uiStore } = useContext(StoreContext);
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

    const Row = useCallback(
      ({ index, style, data }) => {
        const file = data[index];
        return (
          <div role="row" aria-rowindex={index + 1} style={style}>
            <GalleryItem
              file={file}
              select={select}
              showContextMenu={showContextMenu}
              showDetails
            />
          </div>
        );
      },
      [select, showContextMenu],
    );

    return (
      <div className="list" role="grid" aria-rowcount={fileList.length}>
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
      </div>
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

const SlideGallery = observer(({ contentRect }: IGalleryLayoutProps) => {
  const { fileStore, uiStore } = useContext(StoreContext);
  const { fileList } = fileStore;
  // Go to the first selected image on load
  useEffect(() => {
    if (uiStore.fileSelection.size > 0) {
      const firstSelectedId = uiStore.fileSelection.values().next().value;
      uiStore.setFirstItem(fileStore.getIndex(firstSelectedId));
    }
  }, [fileList, uiStore.fileSelection, uiStore, fileStore]);

  // Go back to previous view when pressing the back button (mouse button 5)
  useEffect(() => {
    // Push a dummy state, so that a pop-state event can be activated
    history.pushState(null, document.title, location.href);
    const popStateHandler = uiStore.disableSlideMode;
    window.addEventListener('popstate', popStateHandler);
    return () => window.removeEventListener('popstate', popStateHandler);
  }, [uiStore.disableSlideMode]);

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
      } else if (event.key === 'Escape' || event.key === 'Backspace') {
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

const handleFlyoutBlur = (e: React.FocusEvent) => {
  if (e.relatedTarget && !e.currentTarget.contains(e.relatedTarget as Node)) {
    const dialog = e.currentTarget.lastElementChild as HTMLDialogElement;
    if (dialog.open) {
      dialog.close();
    }
  }
};

const GalleryContextMenuItems = observer(() => {
  const { uiStore, fileStore } = useContext(StoreContext);
  return (
    <>
      <SubMenu icon={IconSet.VIEW_GRID} text="View method...">
        <LayoutMenuItems uiStore={uiStore} />
      </SubMenu>
      <SubMenu icon={IconSet.FILTER_NAME_DOWN} text="Sort by...">
        <SortMenuItems fileStore={fileStore} />
      </SubMenu>
    </>
  );
});

const Gallery = () => {
  const { fileStore, uiStore } = useContext(StoreContext);
  const [contextState, { show, hide }] = useContextMenu({ initialMenu: [<></>, <></>] });
  const {
    open,
    x,
    y,
    menu: [fileMenu, externalMenu],
  } = contextState;
  const { fileList } = fileStore;
  const [contentRect, setContentRect] = useState<Rectangle>({ width: 1, height: 1, x: 0, y: 0 });
  const container = useRef<HTMLDivElement>(null);

  const resizeObserver = useRef(
    new ResizeObserver((entries) => {
      const { contentRect: rect, target } = entries[0];
      setContentRect({
        width: rect.width,
        height: rect.height,
        x: (target as HTMLDivElement).offsetLeft,
        y: (target as HTMLDivElement).offsetTop,
      });
    }),
  );

  useEffect(() => {
    const observer = resizeObserver.current;
    if (container.current) {
      resizeObserver.current.observe(container.current);
    }
    return () => observer.disconnect();
  }, [fileList.length]);

  const { makeSelection, lastSelectionIndex } = useSelectionCursor();

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
    return <Placeholder />;
  }

  return (
    <div
      ref={container}
      id="gallery-content"
      className={`thumbnail-${uiStore.thumbnailSize} thumbnail-${uiStore.thumbnailShape}`}
      onClick={uiStore.clearFileSelection}
      onBlur={handleFlyoutBlur}
    >
      {getLayoutComponent(uiStore.method, uiStore.isSlideMode, {
        contentRect,
        select: handleFileSelect,
        lastSelectionIndex,
        showContextMenu: show,
      })}
      <ContextMenu key="contextmenu" open={open} x={x} y={y} onClose={hide}>
        <Menu>
          {fileMenu}
          <MenuDivider key="divider" />
          <GalleryContextMenuItems key="gallery-menu" />
          {externalMenu}
        </Menu>
      </ContextMenu>
    </div>
  );
};

export default observer(Gallery);
