import { action } from 'mobx';
import { observer } from 'mobx-react-lite';
import React, {
  useRef,
  useCallback,
  useEffect,
  useLayoutEffect,
  useState,
  memo,
  ForwardedRef,
  forwardRef,
} from 'react';
import { FixedSizeList, ListOnScrollProps } from 'react-window';
import { ClientFile } from 'src/entities/File';
import { IFile, OrderDirection } from 'src/api/FileDTO';
import { debouncedThrottle } from 'common/timeout';
import { GalleryProps } from './utils';
import { useStore } from 'src/frontend/contexts/StoreContext';
import { Row } from './ListItem';

/** Generates a unique key for an element in the fileList */
const getItemKey = action((index: number, data: ClientFile[]): string => {
  return data[index].id;
});

const ListGallery = observer(({ contentRect, select, lastSelectionIndex }: GalleryProps) => {
  const { fileStore, uiStore } = useStore();
  const [cellSize, setCellSize] = useState(24);
  const ref = useRef<FixedSizeList>(null);
  const list = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = list.current;
    if (container === null || container.firstElementChild === null) {
      return;
    }
    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      const cellSize = entry.contentRect.height;
      container.style.setProperty('--thumbnail-size', `${cellSize}px`);
      setCellSize(cellSize);
    });
    resizeObserver.observe(container.firstElementChild);
    return () => resizeObserver.disconnect();
  }, []);

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
      select(fileStore.fileList[index], e.ctrlKey || e.metaKey, e.shiftKey);
    });

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fileStore, select]);

  // TODO: resizing columns is broken

  return (
    <FixedSizeList
      useIsScrolling
      height={contentRect.height}
      width={contentRect.width}
      itemSize={cellSize}
      itemCount={fileStore.fileList.length}
      itemData={fileStore.fileList}
      itemKey={getItemKey}
      children={Row}
      onScroll={handleScroll}
      initialScrollOffset={uiStore.firstItem * cellSize}
      ref={ref}
      outerElementType={Table}
      innerElementType={Body}
      outerRef={list}
    />
  );
});

export default ListGallery;

const Table = observer(
  ({ children, ...props }: any, ref: ForwardedRef<HTMLDivElement>) => {
    const { fileStore } = useStore();
    return (
      <div ref={ref} id="list" role="grid" aria-rowcount={fileStore.fileList.length} {...props}>
        <Header />
        {children}
      </div>
    );
  },
  { forwardRef: true },
);

const Body = forwardRef(function Body(
  { children, ...props }: any,
  ref: ForwardedRef<HTMLDivElement>,
) {
  return (
    <div ref={ref} id="list-body" role="rowgroup" {...props}>
      {children}
    </div>
  );
});

interface ColumnHeaderData {
  title: string;
  // Also indicates whether this column _can_ be sorted on
  sortKey?: keyof IFile;
  // cellContent: (props: ICellContentProps) => ReactNode;
}

const COLUMN_HEADERS: ColumnHeaderData[] = [
  { title: 'Name', sortKey: 'name' },
  { title: 'Dimensions' },
  { title: 'Date added', sortKey: 'dateAdded' },
  { title: 'Size', sortKey: 'size' },
  { title: 'Tags' },
];

const Header = () => {
  const header = useRef<HTMLDivElement>(null);

  const setColumnWidth = useRef((name: string, value: number) => {
    const list = header.current?.parentElement;
    if (list) {
      list.style.setProperty(`--col-${name}-width`, `${Math.min(Math.max(value, 100), 800)}px`);
    }
  }).current;

  return (
    <div ref={header} id="list-header" role="rowgroup">
      <div role="row">
        {COLUMN_HEADERS.map(({ sortKey, title }) => {
          if (sortKey !== undefined) {
            return (
              <SortableHeader
                key={title}
                sortKey={sortKey}
                title={title}
                setColumnWidth={setColumnWidth}
              />
            );
          } else {
            return <ColumnHeader key={title} title={title} setColumnWidth={setColumnWidth} />;
          }
        })}
      </div>
    </div>
  );
};

interface ColumnHeaderProps {
  title: string;
  setColumnWidth: (name: string, value: number) => void;
}

const ColumnHeader = memo(function ColumnHeader({ title, setColumnWidth }: ColumnHeaderProps) {
  const header = useRef<HTMLDivElement>(null);
  const name = title.toLowerCase().replaceAll(' ', '-');
  const handleMouseDown = useHeaderResize(header, name, setColumnWidth);

  return (
    <div ref={header} role="columnheader" className={`col-${name} unsortable-header`} key={title}>
      {title}
      <button className="column-resizer" onMouseDown={handleMouseDown}>
        <span className="visually-hidden">Resize column {title}</span>
      </button>
    </div>
  );
});

interface SortableHeaderProps extends ColumnHeaderProps {
  sortKey: keyof IFile;
}

const SortableHeader = observer(({ title, sortKey, setColumnWidth }: SortableHeaderProps) => {
  const { fileStore } = useStore();
  const isSortedBy = fileStore.orderBy === sortKey;
  const sortOrder = isSortedBy
    ? fileStore.orderDirection === OrderDirection.Desc
      ? 'descending'
      : 'ascending'
    : undefined;

  const handleClick = isSortedBy
    ? fileStore.switchOrderDirection
    : () => fileStore.orderFilesBy(sortKey);

  const header = useRef<HTMLDivElement>(null);
  const name = title.toLowerCase().replaceAll(' ', '-');
  const handleMouseDown = useHeaderResize(header, name, setColumnWidth);

  return (
    <div ref={header} role="columnheader" aria-sort={sortOrder} className={`col-${name}`}>
      <button className="sort-button" onClick={handleClick}>
        {title}
      </button>
      <button className="column-resizer" onMouseDown={handleMouseDown}>
        <span className="visually-hidden">Resize column {title}</span>
      </button>
    </div>
  );
});

function useHeaderResize(
  header: React.RefObject<HTMLDivElement>,
  name: string,
  setColumnWidth: (name: string, value: number) => void,
) {
  const isDragging = useRef(false);
  const onResize = useCallback(
    (value: number) => setColumnWidth(name, value),
    [name, setColumnWidth],
  );

  useEffect(() => {
    if (header.current === null) {
      return;
    }

    const handleMouseUp = () => {
      isDragging.current = false;
    };

    // Do it for list reference
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current || header.current === null) {
        return;
      }

      const boundingRect = header.current.getBoundingClientRect();
      onResize(boundingRect.width + (e.clientX - boundingRect.right));
    };

    window.addEventListener('mouseup', handleMouseUp, true);
    window.addEventListener('mousemove', handleMouseMove, true);

    return () => {
      window.removeEventListener('mouseup', handleMouseUp, true);
      window.removeEventListener('mousemove', handleMouseMove, true);
    };
  }, [header, onResize]);

  return useRef(() => {
    isDragging.current = true;
  }).current;
}
