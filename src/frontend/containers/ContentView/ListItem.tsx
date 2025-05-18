import { observer } from 'mobx-react-lite';
import React, { CSSProperties, useEffect, useMemo, useRef, useState } from 'react';

import { formatDateTime, humanFileSize } from 'common/fmt';
import { useStore } from '../../contexts/StoreContext';
import { ClientFile } from '../../entities/File';
import { CommandDispatcher } from './Commands';
import { Thumbnail, ThumbnailTags } from './GalleryItem';

interface RowProps {
  index: number;
  style: CSSProperties;
  data: (ClientFile | undefined)[];
  isScrolling?: boolean;
}

export const Row = ({ index, style, data, isScrolling }: RowProps) => {
  return <ListItem index={index} data={data} style={style} isScrolling={isScrolling || false} />;
};

interface ListItemProps {
  index: number;
  data: (ClientFile | undefined)[];
  style: React.CSSProperties;
  isScrolling: boolean;
}

export const ListItem = observer((props: ListItemProps) => {
  const { index, data, style, isScrolling } = props;
  const { uiStore } = useStore();
  const row = useRef<HTMLDivElement>(null);
  const [isMounted, setIsMounted] = useState(false);
  const file = data[index];
  const eventManager = useMemo(() => (file ? new CommandDispatcher(file) : null), [file]);

  useEffect(() => {
    if (row.current !== null && !isScrolling) {
      setIsMounted(true);
    }
  }, [isScrolling]);

  const showData = !uiStore.isRefreshing;

  return (
    <div
      ref={row}
      role="row"
      aria-rowindex={index + 1}
      aria-selected={file ? uiStore.fileSelection.has(file) : false}
      style={style}
      onClick={eventManager ? eventManager.select : undefined}
      onDoubleClick={eventManager ? eventManager.preview : undefined}
      onContextMenu={eventManager ? eventManager.showContextMenu : undefined}
      onDragStart={eventManager ? eventManager.dragStart : undefined}
      onDragEnter={eventManager ? eventManager.dragEnter : undefined}
      onDragOver={eventManager ? eventManager.dragOver : undefined}
      onDragLeave={eventManager ? eventManager.dragLeave : undefined}
      onDrop={eventManager ? eventManager.drop : undefined}
      onDragEnd={eventManager ? eventManager.dragEnd : undefined}
      draggable
    >
      {/* Filename */}
      <div role="gridcell" className="col-name">
        {showData && file && <Thumbnail mounted={isMounted} file={file} />}
        {showData && file?.name}
      </div>

      {/* Dimensions */}
      <div role="gridcell" className="col-dimensions">
        {showData && file?.width} x {showData && file?.height}
      </div>

      {/* Import date */}
      <div role="gridcell" className="col-date-added">
        {showData && file && formatDateTime(file.dateAdded)}
      </div>

      {/* Size */}
      <div role="gridcell" className="col-size">
        {showData && file && humanFileSize(file.size)}
      </div>

      {/* Tags */}
      <div role="gridcell" className="col-tags">
        {showData && file && eventManager && (
          <ThumbnailTags eventManager={eventManager} file={file} />
        )}
      </div>
    </div>
  );
});
