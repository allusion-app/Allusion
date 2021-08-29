import { action } from 'mobx';
import { observer } from 'mobx-react-lite';
import React, {
  useMemo,
  useRef,
  useCallback,
  useEffect,
  useLayoutEffect,
  useState,
  CSSProperties,
} from 'react';
import { FixedSizeList, ListOnScrollProps } from 'react-window';
import { FileOrder } from 'src/backend/DBRepository';
import { ClientFile, IFile } from 'src/entities/File';
import { useTagDnD } from 'src/frontend/contexts/TagDnDContext';
import { debouncedThrottle } from 'src/frontend/utils';
import { ILayoutProps, createSubmitCommand } from './LayoutSwitcher';
import { GalleryCommand } from './GalleryItem';
import { useStore } from 'src/frontend/contexts/StoreContext';
import { ListItem } from './ListItem';

/** Generates a unique key for an element in the fileList */
const getItemKey = action((index: number, data: ClientFile[]): string => {
  return data[index].id;
});

interface IListGalleryProps {
  handleFileSelect: (
    selectedFile: ClientFile,
    toggleSelection: boolean,
    rangeSelection: boolean,
  ) => void;
}

const ListGallery = observer((props: ILayoutProps & IListGalleryProps) => {
  const { contentRect, select, lastSelectionIndex, showContextMenu, handleFileSelect } = props;
  const { fileStore, uiStore } = useStore();
  const [cellSize, setCellSize] = useState(24);
  const dndData = useTagDnD();
  const submitCommand = useMemo(
    () => createSubmitCommand(dndData, select, showContextMenu, uiStore),
    [dndData, select, showContextMenu, uiStore],
  );
  const ref = useRef<FixedSizeList>(null);

  const throttledScrollHandler = useRef(
    debouncedThrottle(
      action((index: number) => !uiStore.isSlideMode && uiStore.setFirstItem(index)),
      100,
    ),
  );

  const handleScroll = useCallback(
    (props: ListOnScrollProps) =>
      throttledScrollHandler.current(Math.round(props.scrollOffset / cellSize)),
    [cellSize],
  );

  const index = lastSelectionIndex.current;
  const fileSelectionSize = uiStore.fileSelection.size;
  useLayoutEffect(() => {
    if (index !== undefined && ref.current !== null && fileSelectionSize > 0) {
      ref.current.scrollToItem(Math.floor(index));
    }
  }, [index, fileSelectionSize]);

  // While in slide mode, scroll to last shown image if not in view, for transition back to gallery
  const { isSlideMode, firstItem } = uiStore;
  useLayoutEffect(() => {
    if (isSlideMode) {
      ref.current?.scrollToItem(firstItem, 'smart');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSlideMode, firstItem]);

  useEffect(() => {
    const onKeyDown = action((e: KeyboardEvent) => {
      let index = lastSelectionIndex.current;
      if (index === undefined) {
        return;
      }
      if (e.key === 'ArrowUp' && index > 0) {
        index -= 1;
      } else if (e.key === 'ArrowDown' && index < fileStore.fileList.length - 1) {
        index += 1;
      } else {
        return;
      }
      e.preventDefault();
      handleFileSelect(fileStore.fileList[index], e.ctrlKey || e.metaKey, e.shiftKey);
    });

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fileStore, handleFileSelect]);

  const Row = useCallback(
    ({ index, style, data, isScrolling }) => (
      <ListItem
        index={index}
        data={data}
        style={style}
        isScrolling={isScrolling}
        submitCommand={submitCommand}
      />
    ),
    [submitCommand],
  );

  return (
    <div
      id="list"
      role="grid"
      aria-rowcount={fileStore.fileList.length}
      style={
        {
          width: `${contentRect.width}px`,
          height: `${contentRect.height}px`,
          '--thumbnail-size': `${cellSize}px`,
        } as CSSProperties
      }
    >
      <Header setCellSize={setCellSize} />
      <FixedSizeList
        useIsScrolling
        height={contentRect.height - cellSize}
        width="100%"
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
  );
});

export interface IListItem {
  index: number;
  data: ClientFile[];
  style: React.CSSProperties;
  isScrolling: true;
  // onClick: (e: React.MouseEvent) => void;
  // onDoubleClick: (e: React.MouseEvent) => void;
  submitCommand: (command: GalleryCommand) => void;
}

export default ListGallery;

interface IListColumn {
  title: string;
  // Also indicates whether this column _can_ be sorted on
  sortKey?: keyof IFile;
  // cellContent: (props: ICellContentProps) => ReactNode;
}

const COLUMN_HEADERS: IListColumn[] = [
  { title: 'Name', sortKey: 'name' },
  { title: 'Dimensions' },
  { title: 'Date added', sortKey: 'dateAdded' },
  { title: 'Size', sortKey: 'size' },
  { title: 'Tags' },
];

const Header = ({ setCellSize }: { setCellSize: (height: number) => void }) => {
  const resizeObserver = useRef(
    new ResizeObserver((entries) => {
      setCellSize(entries[0].contentRect.height);
    }),
  );

  const observeHeader = useRef((header: HTMLDivElement | null) => {
    if (header !== null) {
      resizeObserver.current.observe(header);
    } else {
      resizeObserver.current.disconnect();
    }
  }).current;

  return (
    <div ref={observeHeader} role="rowgroup" className="list-header">
      <div role="row">
        {COLUMN_HEADERS.map(({ sortKey, title }) => {
          if (sortKey !== undefined) {
            return <SortableHeader key={title} sortKey={sortKey} title={title} />;
          } else {
            return (
              <div
                role="columnheader"
                className={`col-${title.toLowerCase().replaceAll(' ', '-')} unsortable-header`}
                key={title}
              >
                {title}
              </div>
            );
          }
        })}
      </div>
    </div>
  );
};

interface SortableHeaderProps {
  title: string;
  sortKey: keyof IFile;
}

const SortableHeader = observer(({ title, sortKey }: SortableHeaderProps) => {
  const { fileStore } = useStore();
  const isSortedBy = fileStore.orderBy === sortKey;
  const sortOrder = isSortedBy
    ? fileStore.fileOrder === FileOrder.Desc
      ? 'descending'
      : 'ascending'
    : undefined;

  const handleClick = isSortedBy
    ? fileStore.switchFileOrder
    : () => fileStore.orderFilesBy(sortKey);

  return (
    <div
      role="columnheader"
      aria-sort={sortOrder}
      className={`col-${title.toLowerCase().replaceAll(' ', '-')}`}
    >
      <button className="sort-button" onClick={handleClick}>
        {title}
      </button>
    </div>
  );
});
