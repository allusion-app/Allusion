import { observer } from 'mobx-react-lite';
import React, { useMemo, useEffect, useState, useRef, CSSProperties } from 'react';
import { formatDateTime, humanFileSize } from 'common/fmt';
import { Thumbnail, ThumbnailTags } from './GalleryItem';
import { useStore } from 'src/frontend/contexts/StoreContext';
import { ClientFile } from 'src/entities/File';
import { CommandDispatcher } from './Commands';

interface RowProps {
  index: number;
  style: CSSProperties;
  data: ClientFile[];
  isScrolling?: boolean;
}

export const Row = ({ index, style, data, isScrolling }: RowProps) => {
  return <ListItem index={index} data={data} style={style} isScrolling={isScrolling || false} />;
};

interface ListItemProps {
  index: number;
  data: ClientFile[];
  style: React.CSSProperties;
  isScrolling: boolean;
}

export const ListItem = observer((props: ListItemProps) => {
  const { index, data, style, isScrolling } = props;
  const { uiStore } = useStore();
  const row = useRef<HTMLDivElement>(null);
  const [isMounted, setIsMounted] = useState(false);
  const file = data[index];
  const eventManager = useMemo(() => new CommandDispatcher(file), [file]);

  useEffect(() => {
    if (row.current !== null && !isScrolling) {
      setIsMounted(true);
    }
  }, [isScrolling]);

  return (
    <div
      ref={row}
      role="row"
      aria-rowindex={index + 1}
      aria-selected={uiStore.fileSelection.has(file)}
      style={style}
      onClick={eventManager.select}
      onDoubleClick={eventManager.preview}
      onContextMenu={eventManager.showContextMenu}
      onDragStart={eventManager.dragStart}
      onDragEnter={eventManager.dragEnter}
      onDragOver={eventManager.dragOver}
      onDragLeave={eventManager.dragLeave}
      onDrop={eventManager.drop}
      onDragEnd={eventManager.dragEnd}
      draggable
    >
      {/* Filename */}
      <div role="gridcell" className="col-name">
        <Thumbnail mounted={isMounted} file={file} />
        {file.name}
      </div>

      {/* Dimensions */}
      <div role="gridcell" className="col-dimensions">
        {file.width} x {file.height}
      </div>

      {/* Import date */}
      <div role="gridcell" className="col-date-added">
        {formatDateTime(file.dateAdded)}
      </div>

      {/* Size */}
      <div role="gridcell" className="col-size">
        {humanFileSize(file.size)}
      </div>

      {/* Tags */}
      <div role="gridcell" className="col-tags">
        <ThumbnailTags eventManager={eventManager} file={file} />
      </div>
    </div>
  );
});
