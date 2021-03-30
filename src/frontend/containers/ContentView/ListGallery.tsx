import { action } from 'mobx';
import { observer } from 'mobx-react-lite';
import React, { useContext, useMemo, useRef, useCallback, useEffect, useState } from 'react';
import { FixedSizeList, ListOnScrollProps } from 'react-window';
import { FileOrder } from 'src/backend/DBRepository';
import { ClientFile } from 'src/entities/File';
import TagDnDContext from 'src/frontend/contexts/TagDnDContext';
import UiStore from 'src/frontend/stores/UiStore';
import { debouncedThrottle } from 'src/frontend/utils';
import { IconSet } from 'widgets';
import { ILayoutProps, createSubmitCommand } from './Gallery';
import { listColumns, GalleryCommand, ListCell } from './GalleryItem';

/** Generates a unique key for an element in the fileList */
const getItemKey = action((index: number, data: ClientFile[]): string => {
  return data[index].id;
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
  const fileSelectionSize = uiStore.fileSelection.size;
  useEffect(() => {
    if (index !== undefined && ref.current !== null && fileSelectionSize > 0) {
      ref.current.scrollToItem(Math.floor(index));
    }
  }, [index, fileSelectionSize]);

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
    <div ref={row} role="row" aria-rowindex={index + 1} style={style}>
      <ListCell mounted={isMounted} file={file} uiStore={uiStore} submitCommand={submitCommand} />
    </div>
  );
});

export default ListGallery;
