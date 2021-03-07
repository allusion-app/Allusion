import { action } from 'mobx';
import { observer } from 'mobx-react-lite';
import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { FixedSizeList } from 'react-window';
import TagDnDContext, { ITagDnDData } from 'src/frontend/contexts/TagDnDContext';
import { RendererMessenger } from 'src/Messaging';
import { ClientFile } from '../../../entities/File';
import FileStore from '../../stores/FileStore';
import UiStore, { ViewMethod } from '../../stores/UiStore';
import { throttle } from '../../utils';
import { GalleryCommand, GallerySelector, GridCell, ListCell } from './GalleryItem';
import MasonryRenderer from './Masonry/MasonryRenderer';
import { MissingFileMenuItems, FileViewerMenuItems, ExternalAppMenuItems } from './menu-items';
import SlideMode from './SlideMode';

type Dimension = { width: number; height: number };
type UiStoreProp = { uiStore: UiStore };
type FileStoreProp = { fileStore: FileStore };

export interface ILayoutProps extends UiStoreProp, FileStoreProp {
  contentRect: Dimension;
  select: (file: ClientFile, selectAdditive: boolean, selectRange: boolean) => void;
  lastSelectionIndex: React.MutableRefObject<number | undefined>;
  /** menu: [fileMenu, externalMenu] */
  showContextMenu: (x: number, y: number, menu: [JSX.Element, JSX.Element]) => void;
}

const Layout = ({
  contentRect,
  showContextMenu,
  uiStore,
  fileStore,
}: Omit<ILayoutProps, 'select' | 'lastSelectionIndex'>) => {
  // Todo: Select by dragging a rectangle shape
  // Could maybe be accomplished with https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API
  // Also take into account scrolling when dragging while selecting

  /** The first item that is selected in a multi-selection */
  const initialSelectionIndex = useRef<number>();
  /** The last item that is selected in a multi-selection */
  const lastSelectionIndex = useRef<number>();

  const handleFileSelect = useCallback(
    (selectedFile: ClientFile, toggleSelection: boolean, rangeSelection: boolean) => {
      /** The index of the actived item */
      const i = fileStore.getIndex(selectedFile.id);

      // If nothing is selected, initialize the selection range and select that single item
      if (lastSelectionIndex.current === undefined) {
        initialSelectionIndex.current = i;
        lastSelectionIndex.current = i;
        uiStore.toggleFileSelection(selectedFile);
        return;
      }
      // Mark this index as the last item that was selected
      lastSelectionIndex.current = i;

      if (rangeSelection && initialSelectionIndex.current !== undefined) {
        if (i === undefined) {
          return;
        }
        if (i < initialSelectionIndex.current) {
          uiStore.selectFileRange(i, initialSelectionIndex.current, toggleSelection);
        } else {
          uiStore.selectFileRange(initialSelectionIndex.current, i, toggleSelection);
        }
      } else if (toggleSelection) {
        uiStore.toggleFileSelection(selectedFile);
        initialSelectionIndex.current = fileStore.getIndex(selectedFile.id);
      } else {
        uiStore.selectFile(selectedFile, true);
        initialSelectionIndex.current = fileStore.getIndex(selectedFile.id);
      }
    },
    [fileStore, uiStore],
  );

  // Reset selection range when number of items changes: Else you can get phantom files when continuing your selection
  useEffect(() => {
    initialSelectionIndex.current = undefined;
    lastSelectionIndex.current = undefined;
  }, [fileStore.fileList.length]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      let index = lastSelectionIndex.current;
      if (index === undefined) {
        return;
      }
      if (e.key === 'ArrowLeft' && index > 0) {
        index -= 1;
      } else if (e.key === 'ArrowRight' && index < fileStore.fileList.length - 1) {
        index += 1;
      } else {
        return;
      }
      handleFileSelect(fileStore.fileList[index], e.ctrlKey || e.metaKey, e.shiftKey);
    };

    const throttledKeyDown = throttle(onKeyDown, 50);

    window.addEventListener('keydown', throttledKeyDown);
    return () => window.removeEventListener('keydown', throttledKeyDown);
  }, [fileStore, handleFileSelect]);

  if (uiStore.isSlideMode) {
    return <SlideMode contentRect={contentRect} />;
  }
  if (contentRect.width < 10) {
    return null;
  }
  switch (uiStore.method) {
    case ViewMethod.Grid:
      return (
        <GridGallery
          contentRect={contentRect}
          select={handleFileSelect}
          lastSelectionIndex={lastSelectionIndex}
          showContextMenu={showContextMenu}
          uiStore={uiStore}
          fileStore={fileStore}
        />
      );
    case ViewMethod.MasonryVertical:
    case ViewMethod.MasonryHorizontal:
      return (
        <MasonryRenderer
          contentRect={contentRect}
          type={uiStore.method}
          lastSelectionIndex={lastSelectionIndex}
          showContextMenu={showContextMenu}
          select={handleFileSelect}
          uiStore={uiStore}
          fileStore={fileStore}
        />
      );
    case ViewMethod.List:
      return (
        <ListGallery
          contentRect={contentRect}
          select={handleFileSelect}
          lastSelectionIndex={lastSelectionIndex}
          showContextMenu={showContextMenu}
          uiStore={uiStore}
          fileStore={fileStore}
        />
      );
    default:
      return null;
  }
};

// Some extra padding in the Grid view, so that the scrollbar will not overlap with the content
const CONTENT_PADDING_RIGHT = 12;

// TODO: Move views to separate files
const GridGallery = observer((props: ILayoutProps) => {
  const { contentRect, select, lastSelectionIndex, showContextMenu, uiStore, fileStore } = props;
  const { fileList } = fileStore;
  const dndData = useContext(TagDnDContext);
  const [minSize, maxSize] = useMemo(() => getThumbnailSize(uiStore.thumbnailSize), [
    uiStore.thumbnailSize,
  ]);
  const [[numColumns, cellSize], setDimensions] = useState([0, 0]);

  const submitCommand = useMemo(
    () => createSubmitCommand(dndData, fileStore, select, showContextMenu, uiStore),
    [dndData, fileStore, select, showContextMenu, uiStore],
  );

  useEffect(() => {
    const timeoutID = setTimeout(() => {
      setDimensions(get_column_layout(contentRect.width - CONTENT_PADDING_RIGHT, minSize, maxSize));
    }, 50);

    return () => clearTimeout(timeoutID);
  }, [contentRect.width, maxSize, minSize]);

  const numRows = useMemo(() => (numColumns > 0 ? Math.ceil(fileList.length / numColumns) : 0), [
    fileList.length,
    numColumns,
  ]);

  const ref = useRef<FixedSizeList>(null);
  const innerRef = useRef<HTMLElement>(null);
  // FIXME: Hardcoded until responsive design is done.
  const TOOLBAR_HEIGHT = 48;
  const intersectionObserver = useRef(
    new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          // Rounding is expensive, so we check if it whithin the toolbar bottom edge.
          if (e.isIntersecting && e.intersectionRect.y < TOOLBAR_HEIGHT + 1) {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            const rowIndex = parseInt(e.target.getAttribute('aria-rowindex')!) - 1;
            const index = rowIndex * e.target.childElementCount;
            uiStore.setFirstItem(index);
            // Make first item in viewport focusable if there is nothing to tab to.
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            if (e.target.parentElement!.querySelector('[tabindex="0"]') === null) {
              (e.target.firstElementChild as HTMLElement).tabIndex = 0;
            }
            break;
          }
        }
      },
      { threshold: [0, 1] },
    ),
  );

  useEffect(() => () => intersectionObserver.current.disconnect(), []);

  useEffect(() => {
    if (innerRef.current !== null) {
      innerRef.current.style.setProperty('--thumbnail-size', cellSize - PADDING + 'px');
    }
  }, [cellSize]);

  const index = lastSelectionIndex.current;
  useEffect(() => {
    if (index !== undefined && ref.current !== null) {
      ref.current.scrollToItem(Math.floor(index / numColumns));
    }
  }, [index, numColumns, uiStore.fileSelection.size]);

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
    ({ index, style, data, isScrolling }) => (
      <GridRow
        index={index}
        data={data}
        style={style}
        isScrolling={isScrolling}
        observer={intersectionObserver.current}
        columns={numColumns}
        uiStore={uiStore}
        fileStore={fileStore}
        submitCommand={submitCommand}
      />
    ),
    [fileStore, numColumns, submitCommand, uiStore],
  );

  return (
    <div className="grid" role="grid" aria-rowcount={numRows} aria-colcount={numColumns}>
      <FixedSizeList
        useIsScrolling
        height={contentRect.height}
        width={contentRect.width}
        itemSize={cellSize}
        itemCount={numRows}
        itemData={fileList}
        itemKey={getItemKey}
        overscanCount={2}
        children={Row}
        initialScrollOffset={Math.round(uiStore.firstItem / numColumns) * cellSize || 0} // || 0 for initial load
        ref={ref}
        innerRef={innerRef}
      />
    </div>
  );
});

const ListGallery = observer((props: ILayoutProps) => {
  const { contentRect, select, lastSelectionIndex, showContextMenu, uiStore, fileStore } = props;
  const dndData = useContext(TagDnDContext);
  const cellSize = useMemo(() => getThumbnailSize(uiStore.thumbnailSize)[1], [
    uiStore.thumbnailSize,
  ]);
  const submitCommand = useMemo(
    () => createSubmitCommand(dndData, fileStore, select, showContextMenu, uiStore),
    [dndData, fileStore, select, showContextMenu, uiStore],
  );
  const ref = useRef<FixedSizeList>(null);
  // FIXME: Hardcoded until responsive design is done.
  const TOOLBAR_HEIGHT = 48;
  const intersectionObserver = useRef(
    new IntersectionObserver(
      (entries) => {
        // Rounding is expensive, so we check if it whithin the toolbar bottom edge.
        for (const e of entries) {
          if (e.isIntersecting && e.intersectionRect.y < TOOLBAR_HEIGHT + 1) {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            const rowIndex = e.target.getAttribute('aria-rowindex')!;
            uiStore.setFirstItem(parseInt(rowIndex) - 1);
            // Make first item in viewport focusable if there is nothing to tab to.
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            if (e.target.parentElement!.querySelector('[tabindex="0"]') === null) {
              (e.target.firstElementChild as HTMLElement).tabIndex = 0;
            }
            break;
          }
        }
      },
      { threshold: [0, 1] },
    ),
  );

  useEffect(() => () => intersectionObserver.current.disconnect(), []);

  const index = lastSelectionIndex.current;
  useEffect(() => {
    if (index !== undefined && ref.current !== null) {
      ref.current.scrollToItem(Math.floor(index));
    }
  }, [index, uiStore.fileSelection.size]);

  const Row = useCallback(
    ({ index, style, data, isScrolling }) => (
      <ListItem
        index={index}
        data={data}
        style={style}
        isScrolling={isScrolling}
        observer={intersectionObserver.current}
        uiStore={uiStore}
        submitCommand={submitCommand}
      />
    ),
    [submitCommand, uiStore],
  );

  return (
    <div className="list" role="grid" aria-rowcount={fileStore.fileList.length}>
      <FixedSizeList
        useIsScrolling
        height={contentRect.height}
        width={contentRect.width}
        itemSize={cellSize}
        itemCount={fileStore.fileList.length}
        itemData={fileStore.fileList}
        itemKey={getItemKey}
        overscanCount={2}
        children={Row}
        initialScrollOffset={uiStore.firstItem * cellSize}
        ref={ref}
      />
    </div>
  );
});

interface IListItem {
  index: number;
  data: ClientFile[];
  style: React.CSSProperties;
  isScrolling: true;
  observer: IntersectionObserver;
  uiStore: UiStore;
  submitCommand: (command: GalleryCommand) => void;
}

const ListItem = observer((props: IListItem) => {
  const { index, data, style, isScrolling, observer, uiStore, submitCommand } = props;
  const row = useRef<HTMLDivElement>(null);
  const [isMounted, setIsMounted] = useState(false);
  const file = data[index];

  useEffect(() => {
    const element = row.current;
    if (element !== null && !isMounted && !isScrolling) {
      setIsMounted(true);
      observer.observe(element);
    }
  }, [isMounted, isScrolling, observer]);

  useEffect(() => {
    const unobserveTarget = () => {
      if (row.current) {
        observer.unobserve(row.current);
      }
    };
    return unobserveTarget;
  }, [observer]);

  return (
    <div ref={row} role="row" aria-rowindex={index + 1} style={style}>
      <ListCell mounted={isMounted} file={file} uiStore={uiStore} submitCommand={submitCommand} />
    </div>
  );
});

interface IGridRow extends IListItem {
  columns: number;
  fileStore: FileStore;
  submitCommand: (command: GalleryCommand) => void;
}

const GridRow = observer((props: IGridRow) => {
  const {
    index,
    data,
    style,
    isScrolling,
    observer,
    columns,
    uiStore,
    fileStore,
    submitCommand,
  } = props;
  const row = useRef<HTMLDivElement>(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    const element = row.current;
    if (element !== null && !isMounted && !isScrolling) {
      observer.observe(element);
      setIsMounted(true);
    }
  }, [isMounted, isScrolling, observer]);

  useEffect(() => {
    const unobserveTarget = () => {
      if (row.current) {
        observer.unobserve(row.current);
      }
    };
    return unobserveTarget;
  }, [observer]);

  const offset = index * columns;
  return (
    <div ref={row} role="row" aria-rowindex={index + 1} style={style}>
      {data.slice(offset, offset + columns).map((file: ClientFile, i: number) => (
        <GridCell
          mounted={isMounted}
          colIndex={i + 1}
          key={file.id}
          file={file}
          uiStore={uiStore}
          fileStore={fileStore}
          submitCommand={submitCommand}
        />
      ))}
    </div>
  );
});

export default observer(Layout);

// WIP > better general thumbsize. See if we kind find better size ratio for different screensize.
// We'll have less loss of space perhaps
// https://stackoverflow.com/questions/57327107/typeerror-cannot-read-property-getprimarydisplay-of-undefined-screen-getprim
// const {screen} = remote;
// const {width} = screen.getPrimaryDisplay().workAreaSize;
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

export function getThumbnailSize(sizeType: 'small' | 'medium' | 'large') {
  if (sizeType === 'small') {
    return [CELL_SIZE_SMALL * SHRINK_FACTOR, CELL_SIZE_SMALL];
  } else if (sizeType === 'medium') {
    return [CELL_SIZE_MEDIUM * SHRINK_FACTOR, CELL_SIZE_MEDIUM];
  }
  return [CELL_SIZE_LARGE * SHRINK_FACTOR, CELL_SIZE_LARGE];
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
const getItemKey = action((index: number, data: ClientFile[]): string => {
  return data[index].id;
});

export function createSubmitCommand(
  dndData: ITagDnDData,
  fileStore: FileStore,
  select: (file: ClientFile, selectAdditive: boolean, selectRange: boolean) => void,
  showContextMenu: (x: number, y: number, menu: [JSX.Element, JSX.Element]) => void,
  uiStore: UiStore,
): (command: GalleryCommand) => void {
  return action((command: GalleryCommand) => {
    switch (command.selector) {
      case GallerySelector.Click: {
        const [file, metaKey, shitfKey] = command.payload;
        select(file, metaKey, shitfKey);
        break;
      }

      case GallerySelector.DoubleClick:
        uiStore.selectFile(command.payload, true);
        uiStore.enableSlideMode();
        break;

      case GallerySelector.ContextMenu: {
        const [file, x, y] = command.payload;
        showContextMenu(x, y, [
          file.isBroken ? (
            <MissingFileMenuItems uiStore={uiStore} fileStore={fileStore} />
          ) : (
            <FileViewerMenuItems file={file} uiStore={uiStore} />
          ),
          file.isBroken ? <></> : <ExternalAppMenuItems path={file.absolutePath} />,
        ]);
        break;
      }

      // If the file is selected, add all selected items to the drag event, for
      // exporting to your file explorer or programs like PureRef.
      // Creating an event in the main process turned out to be the most robust,
      // did many experiments with drag event content types. Creating a drag
      // event with multiple images did not work correctly from the browser side
      // (e.g. only limited to thumbnails, not full images).
      case GallerySelector.DragStart: {
        const file = command.payload;
        if (!uiStore.fileSelection.has(file)) {
          return;
        }
        if (uiStore.fileSelection.size > 1) {
          RendererMessenger.startDragExport(
            Array.from(uiStore.fileSelection, (f) => f.absolutePath),
          );
        } else {
          RendererMessenger.startDragExport([file.absolutePath]);
        }

        // However, from the main process, there is no way to attach some information to indicate it's an "internal event" that shouldn't trigger the drop overlay
        // So we can store the date when the event starts... Hacky but it works :)
        (window as any).internalDragStart = new Date();
      }

      case GallerySelector.DragOver:
        dndData.target = command.payload;
        break;

      case GallerySelector.DragLeave:
        dndData.target = command.payload;
        break;

      case GallerySelector.Drop:
        if (dndData.source !== undefined) {
          const dropFile = command.payload;
          const ctx = uiStore.getTagContextItems(dndData.source.id);

          // Tag all selected files - unless the file that is being tagged is not selected
          const filesToTag = uiStore.fileSelection.has(dropFile)
            ? [...uiStore.fileSelection]
            : [dropFile];

          for (const tag of ctx) {
            for (const file of filesToTag) {
              file.addTag(tag);
            }
          }
        }

      default:
        break;
    }
  });
}
