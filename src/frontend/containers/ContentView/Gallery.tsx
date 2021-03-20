import { action } from 'mobx';
import { observer } from 'mobx-react-lite';
import React, { useCallback, useEffect, useMemo, useRef, useState, useContext } from 'react';
import { FixedSizeList, ListOnScrollProps } from 'react-window';
import { FileOrder } from 'src/backend/DBRepository';
import { RendererMessenger } from 'src/Messaging';
import { IconSet } from 'widgets';
import { ClientFile } from '../../../entities/File';
import FileStore from '../../stores/FileStore';
import UiStore, { ViewMethod } from '../../stores/UiStore';
import { throttle, debouncedThrottle } from '../../utils';
import { GalleryCommand, GridCell, ListCell, listColumns, GallerySelector } from './GalleryItem';
import MasonryRenderer from './Masonry/MasonryRenderer';
import { ExternalAppMenuItems, FileViewerMenuItems, MissingFileMenuItems } from './menu-items';
import SlideMode from './SlideMode';
import TagDnDContext, { ITagDnDData } from 'src/frontend/contexts/TagDnDContext';

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

  const throttledScrollHandler = useRef(
    debouncedThrottle((index: number) => uiStore.setFirstItem(index), 100),
  );

  const handleScroll = useCallback(
    (props: ListOnScrollProps) =>
      throttledScrollHandler.current(Math.round(props.scrollOffset / cellSize) * numColumns),
    [cellSize, numColumns],
  );

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
        onScroll={handleScroll}
        initialScrollOffset={Math.round(uiStore.firstItem / numColumns) * cellSize || 0} // || 0 for initial load
        ref={ref}
        innerRef={innerRef}
      />
    </div>
  );
});

const ListGallery = observer((props: ILayoutProps) => {
  const { contentRect, select, lastSelectionIndex, showContextMenu, uiStore, fileStore } = props;
  const cellSize = 24;
  const dndData = useContext(TagDnDContext);
  const submitCommand = useMemo(
    () => createSubmitCommand(dndData, fileStore, select, showContextMenu, uiStore),
    [dndData, fileStore, select, showContextMenu, uiStore],
  );
  const ref = useRef<FixedSizeList>(null);

  const throttledScrollHandler = useRef(
    debouncedThrottle((index: number) => uiStore.setFirstItem(index), 100),
  );

  const handleScroll = useCallback(
    (props: ListOnScrollProps) =>
      throttledScrollHandler.current(Math.round(props.scrollOffset / cellSize)),
    [cellSize],
  );

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
        uiStore={uiStore}
        submitCommand={submitCommand}
      />
    ),
    [submitCommand, uiStore],
  );

  return (
    <>
      <div className="list-header" style={{ width: `${contentRect.width}px` }}>
        {listColumns.map((col) => (
          <div
            key={col.title}
            className={col.sortKey ? 'sortable' : ''}
            // Click to sort by this key. If already sorting by this key, swap order around.
            onClick={
              col.sortKey
                ? fileStore.orderBy === col.sortKey
                  ? fileStore.switchFileOrder
                  : () => fileStore.orderFilesBy(col.sortKey)
                : undefined
            }
          >
            <span>{col.title}</span>
            {fileStore.orderBy === col.sortKey && (
              <span>
                {fileStore.fileOrder === FileOrder.Desc ? IconSet.ARROW_DOWN : IconSet.ARROW_UP}
              </span>
            )}
          </div>
        ))}
      </div>
      <div className="list" role="grid" aria-rowcount={fileStore.fileList.length}>
        <FixedSizeList
          useIsScrolling
          // Subtract 24 for header
          // TODO: Also subtract scroll bar width if visible
          height={contentRect.height - 24}
          width={contentRect.width}
          itemSize={cellSize}
          itemCount={fileStore.fileList.length}
          itemData={fileStore.fileList}
          itemKey={getItemKey}
          overscanCount={8}
          children={Row}
          onScroll={handleScroll}
          initialScrollOffset={uiStore.firstItem * cellSize}
          ref={ref}
        />
      </div>
    </>
  );
});

interface IListItem {
  index: number;
  data: ClientFile[];
  style: React.CSSProperties;
  isScrolling: true;
  uiStore: UiStore;
  // onClick: (e: React.MouseEvent) => void;
  // onDoubleClick: (e: React.MouseEvent) => void;
  submitCommand: (command: GalleryCommand) => void;
}

const ListItem = observer((props: IListItem) => {
  const { index, data, style, isScrolling, uiStore, submitCommand } = props;
  const row = useRef<HTMLDivElement>(null);
  const [isMounted, setIsMounted] = useState(false);
  const file = data[index];

  useEffect(() => {
    const element = row.current;
    if (element !== null && !isMounted && !isScrolling) {
      setIsMounted(true);
    }
  }, [isMounted, isScrolling]);

  return (
    <div
      ref={row}
      role="row"
      aria-rowindex={index + 1}
      style={style}
      // onClick={props.onClick}
      // onDoubleClick={props.onDoubleClick}
    >
      <ListCell mounted={isMounted} file={file} uiStore={uiStore} submitCommand={submitCommand} />
    </div>
  );
});

interface IGridRow {
  index: number;
  data: ClientFile[];
  style: React.CSSProperties;
  isScrolling: true;
  uiStore: UiStore;
  columns: number;
  fileStore: FileStore;
  submitCommand: (command: GalleryCommand) => void;
}

const GridRow = observer((props: IGridRow) => {
  const { index, data, style, isScrolling, columns, uiStore, fileStore, submitCommand } = props;
  const row = useRef<HTMLDivElement>(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    const element = row.current;
    if (element !== null && !isMounted && !isScrolling) {
      setIsMounted(true);
    }
  }, [isMounted, isScrolling]);

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

function getListItemIndex(
  e: React.MouseEvent,
  matches: (target: HTMLElement) => boolean,
): number | undefined {
  const target = e.target as HTMLElement;
  const currentTarget = e.currentTarget as HTMLElement;
  if (matches(target) || matches(currentTarget)) {
    e.stopPropagation();
    // Each thumbnail is in a gridcell which is owned by a row.
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const rowIndex = (target.closest('[role="row"]') ||
      currentTarget.closest('[role="row"]'))!.getAttribute('aria-rowindex')!;
    return parseInt(rowIndex) - 1;
  }
  return undefined;
}

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
