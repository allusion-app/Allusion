import { action, runInAction } from 'mobx';
import { observer } from 'mobx-react-lite';
import React, { useMemo, useRef, useCallback, useEffect, useState } from 'react';
import { FixedSizeList, ListOnScrollProps } from 'react-window';
import { FileOrder } from 'src/backend/DBRepository';
import { ClientFile } from 'src/entities/File';
import { useTagDnD } from 'src/frontend/contexts/TagDnDContext';
import { debouncedThrottle } from 'src/frontend/utils';
import { IconSet } from 'widgets';
import { ILayoutProps, createSubmitCommand } from './LayoutSwitcher';
import { listColumns, GalleryCommand, ListCell } from './GalleryItem';
import { useStore } from 'src/frontend/contexts/StoreContext';

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
  const cellSize = 24;
  const dndData = useTagDnD();
  const submitCommand = useMemo(
    () => createSubmitCommand(dndData, select, showContextMenu, uiStore),
    [dndData, select, showContextMenu, uiStore],
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
  const fileSelectionSize = uiStore.fileSelection.size;
  useEffect(() => {
    if (index !== undefined && ref.current !== null && fileSelectionSize > 0) {
      ref.current.scrollToItem(Math.floor(index));
    }
  }, [index, fileSelectionSize]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      runInAction(() => {
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
    };

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
  // onClick: (e: React.MouseEvent) => void;
  // onDoubleClick: (e: React.MouseEvent) => void;
  submitCommand: (command: GalleryCommand) => void;
}

const ListItem = observer((props: IListItem) => {
  const { index, data, style, isScrolling, submitCommand } = props;
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
    <div ref={row} role="row" aria-rowindex={index + 1} style={style}>
      <ListCell mounted={isMounted} file={file} submitCommand={submitCommand} />
    </div>
  );
});

export default ListGallery;
