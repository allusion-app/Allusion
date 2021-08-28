import { observer } from 'mobx-react-lite';
import React, { useMemo, useEffect, useState, useRef } from 'react';
import { formatDateTime, humanFileSize } from 'src/frontend/utils';
import { GalleryEventHandler, Thumbnail, ThumbnailContainer, ThumbnailTags } from './GalleryItem';
import { useStore } from 'src/frontend/contexts/StoreContext';
import { IListItem } from './ListGallery';

export const ListItem = observer((props: IListItem) => {
  const { index, data, style, isScrolling, submitCommand } = props;
  const { uiStore } = useStore();
  const row = useRef<HTMLDivElement>(null);
  const [isMounted, setIsMounted] = useState(false);
  const file = data[index];
  const eventHandlers = useMemo(() => new GalleryEventHandler(file, submitCommand).handlers, [
    file,
    submitCommand,
  ]);

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
      {...eventHandlers}
    >
      {/* Filename */}
      <div role="gridcell">
        <ThumbnailContainer file={file} submitCommand={submitCommand}>
          {isMounted ? (
            <Thumbnail mounted={isMounted} file={file} />
          ) : (
            <div className="thumbnail-placeholder" />
          )}
        </ThumbnailContainer>
        <span className="filename">{file.name}</span>
      </div>
      {/* Dimensions */}
      <div role="gridcell">
        {file.width} x {file.height}
      </div>

      {/* Import date */}
      <div role="gridcell">{formatDateTime(file.dateAdded)}</div>

      {/* Size */}
      <div role="gridcell">{humanFileSize(file.size)}</div>

      {/* Tags */}
      <div role="gridcell">
        <ThumbnailTags file={file} />
      </div>
    </div>
  );
});
