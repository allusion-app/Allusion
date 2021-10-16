import { action, when } from 'mobx';
import { observer } from 'mobx-react-lite';
import React, { useCallback, useMemo } from 'react';
import fse from 'fs-extra';
import { ClientFile } from 'src/entities/File';
import { ClientTag } from 'src/entities/Tag';
import { useStore } from 'src/frontend/contexts/StoreContext';
import { Poll, usePromise, Result } from 'src/frontend/hooks/usePromise';
import { ellipsize, encodeFilePath, humanFileSize } from 'src/frontend/utils';
import { IconButton, IconSet, Tag } from 'widgets';
import { CommandDispatcher, MousePointerEvent } from './Commands';
import { ITransform } from './Masonry/MasonryWorkerAdapter';

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
          <Thumbnail mounted={mounted} file={file} forceNoThumbnail={forceNoThumbnail} />
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

// TODO: When a filename contains https://x/y/z.abc?323 etc., it can't be found
// e.g. %2F should be %252F on filesystems. Something to do with decodeURI, but seems like only on the filename - not the whole path
export const Thumbnail = observer(({ file, mounted, forceNoThumbnail }: ItemProps) => {
  const { uiStore, fileStore } = useStore();
  const { thumbnailPath, isBroken } = file;

  // This will check whether a thumbnail exists, generate it if needed
  const imageSource: Poll<Result<string, any>> = usePromise(
    file,
    isBroken,
    mounted,
    thumbnailPath,
    uiStore.isList || !forceNoThumbnail,
    async (file, isBroken, mounted, thumbnailPath, useThumbnail) => {
      // If it is broken, only show thumbnail if it exists.
      if (!mounted || isBroken === true) {
        if (await fse.pathExists(thumbnailPath)) {
          return thumbnailPath;
        } else {
          throw new Error('No thumbnail available.');
        }
      }

      if (useThumbnail) {
        const freshlyGenerated = await fileStore.imageLoader.ensureThumbnail(file);
        // The thumbnailPath of an image is always set, but may not exist yet.
        // When the thumbnail is finished generating, the path will be changed to `${thumbnailPath}?v=1`.
        if (freshlyGenerated) {
          await when(() => file.thumbnailPath.endsWith('?v=1'));
        }
        return getThumbnail(file);
      } else {
        const src = await fileStore.imageLoader.getImageSrc(file);
        if (src !== undefined) {
          return src;
        } else {
          throw new Error('No thumbnail available.');
        }
      }
    },
  );

  if (!mounted) {
    return <span className="image-placeholder" />;
  } else if (imageSource.tag === 'ready') {
    if ('ok' in imageSource.value) {
      return <img src={encodeFilePath(imageSource.value.ok)} alt="" data-file-id={file.id} />;
    } else {
      return <span className="image-error" />;
    }
  } else {
    return <span className="image-loading" />;
  }
});

const getThumbnail = action((file: ClientFile) => file.thumbnailPath);

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
