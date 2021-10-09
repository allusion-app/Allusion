import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { observer } from 'mobx-react-lite';
import { ClientFile } from 'src/entities/File';
import { ellipsize, encodeFilePath, humanFileSize } from 'src/frontend/utils';
import { IconButton, IconSet, Tag } from 'widgets';
import { ensureThumbnail } from '../../ThumbnailGeneration';
import { ITransform } from './Masonry/MasonryWorkerAdapter';
import { ClientTag } from 'src/entities/Tag';
import { useStore } from 'src/frontend/contexts/StoreContext';
import { CommandDispatcher, MousePointerEvent } from './Commands';

interface ItemProps {
  file: ClientFile;
  mounted: boolean;
  // Will use the original image instead of the thumbnail
  forceNoThumbnail?: boolean;
}

interface MasonryItemProps extends ItemProps {
  forceNoThumbnail: boolean;
  transform: ITransform;
}

export const MasonryCell = observer(
  ({
    file,
    mounted,
    forceNoThumbnail,
    transform: { height, width, left, top },
  }: MasonryItemProps) => {
    const { uiStore, fileStore } = useStore();
    const style = { height, width, transform: `translate(${left}px,${top}px)` };
    const eventManager = useMemo(() => new CommandDispatcher(file), [file]);

    return (
      <div data-masonrycell aria-selected={uiStore.fileSelection.has(file)} style={style}>
        <div
          className={`thumbnail${file.isBroken ? ' thumbnail-broken' : ''}`}
          onClick={eventManager.select}
          onDoubleClick={eventManager.preview}
          onContextMenu={eventManager.showContextMenu}
          onDragStart={eventManager.dragStart}
          onDragEnter={eventManager.dragEnter}
          onDragOver={eventManager.dragOver}
          onDragLeave={eventManager.dragLeave}
          onDrop={eventManager.drop}
          onDragEnd={eventManager.dragEnd}
        >
          <Thumbnail mounted={!mounted} file={file} forceNoThumbnail={forceNoThumbnail} />
        </div>
        {file.isBroken === true && !fileStore.showsMissingContent && (
          <IconButton
            className="thumbnail-broken-overlay"
            icon={IconSet.WARNING_BROKEN_LINK}
            onClick={async (e) => {
              e.stopPropagation();
              e.preventDefault();
              await fileStore.fetchMissingFiles();
            }}
            text="This image could not be found. Open the recovery view."
          />
        )}

        {uiStore.isThumbnailFilenameOverlayEnabled && <ThumbnailFilename file={file} />}

        {/* Show tags when the option is enabled, or when the file is selected */}
        {(uiStore.isThumbnailTagOverlayEnabled || uiStore.fileSelection.has(file)) &&
          (!mounted ? (
            <span className="thumbnail-tags" />
          ) : (
            <ThumbnailTags file={file} eventManager={eventManager} />
          ))}
      </div>
    );
  },
);

const enum ThumbnailState {
  Ok,
  Loading,
  Error,
}

// TODO: When a filename contains https://x/y/z.abc?323 etc., it can't be found
// e.g. %2F should be %252F on filesystems. Something to do with decodeURI, but seems like only on the filename - not the whole path
export const Thumbnail = observer(({ file, mounted, forceNoThumbnail }: ItemProps) => {
  const { uiStore } = useStore();
  const { thumbnailDirectory } = uiStore;
  const { thumbnailPath, isBroken } = file;

  // Initially, we assume the thumbnail exists
  const [state, setState] = useState(ThumbnailState.Ok);

  // This will check whether a thumbnail exists, generate it if needed
  useEffect(() => {
    let isMounted = true;
    if ((!mounted && isBroken === true) || forceNoThumbnail) {
      return;
    }
    ensureThumbnail(file, thumbnailDirectory)
      .then((exists) => {
        if (isMounted && exists) {
          setState(ThumbnailState.Ok);
        } else if (isBroken !== true && isMounted) {
          setState(ThumbnailState.Loading);
        } else if (isMounted) {
          setState(ThumbnailState.Error);
        }
      })
      .catch(() => setState(ThumbnailState.Error));

    return () => {
      isMounted = false;
    };
  }, [file, forceNoThumbnail, isBroken, mounted, thumbnailDirectory]);

  // The thumbnailPath of an image is always set, but may not exist yet.
  // When the thumbnail is finished generating, the path will be changed to `${thumbnailPath}?v=1`,
  // which we detect here to know the thumbnail is ready
  useEffect(() => {
    if (!mounted && thumbnailPath.endsWith('?v=1')) {
      setState(ThumbnailState.Ok);
    }
  }, [thumbnailPath, mounted]);

  if (state === ThumbnailState.Ok) {
    // When the thumbnail cannot be loaded, display an error
    const handleImageError = () => {
      console.log('Could not load image:', thumbnailPath);
      setState(ThumbnailState.Error);
    };
    return (
      <img
        src={encodeFilePath(forceNoThumbnail ? file.absolutePath : thumbnailPath)}
        onError={handleImageError}
        alt=""
        data-file-id={file.id}
      />
    );
  } else if (state === ThumbnailState.Loading) {
    return <span className="image-loading" />;
  } else {
    return <span className="image-error" />;
  }
});

export const ThumbnailTags = observer(
  ({ file, eventManager }: { file: ClientFile; eventManager: CommandDispatcher }) => {
    return (
      <span
        className="thumbnail-tags"
        onClick={eventManager.select}
        onContextMenu={eventManager.showContextMenu}
        onDoubleClick={eventManager.preview}
      >
        {Array.from(file.tags, (tag) => (
          <TagWithHint key={tag.id} tag={tag} onContextMenu={eventManager.showTagContextMenu} />
        ))}
      </span>
    );
  },
);

const TagWithHint = observer(
  ({
    tag,
    onContextMenu,
  }: {
    tag: ClientTag;
    onContextMenu: (e: MousePointerEvent, tag: ClientTag) => void;
  }) => {
    const handleContextMenu = useCallback(
      (e: React.MouseEvent<HTMLElement>) => onContextMenu?.(e, tag),
      [onContextMenu, tag],
    );
    return (
      <Tag
        text={tag.name}
        color={tag.viewColor}
        tooltip={tag.treePath.map((t) => t.name).join(' › ')}
        onContextMenu={handleContextMenu}
      />
    );
  },
);

const ThumbnailFilename = ({ file }: { file: ClientFile }) => {
  const title = `${ellipsize(file.absolutePath, 80, 'middle')}, ${file.width}x${
    file.height
  }, ${humanFileSize(file.size)}`;

  return (
    <div className="thumbnail-filename" data-tooltip={title}>
      {file.name}
    </div>
  );
};
