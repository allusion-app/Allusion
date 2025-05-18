import fse from 'fs-extra';
import { action } from 'mobx';
import { observer } from 'mobx-react-lite';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { ellipsize, humanFileSize } from 'common/fmt';
import { encodeFilePath, isFileExtensionVideo } from 'common/fs';
import { IconButton, IconSet, Tag } from 'widgets';
import { useStore } from '../../contexts/StoreContext';
import { ClientFile } from '../../entities/File';
import { ClientTag } from '../../entities/Tag';
import { usePromise } from '../../hooks/usePromise';
import { CommandDispatcher, MousePointerEvent } from './Commands';
import { ITransform } from './Masonry/layout-helpers';
import { GalleryVideoPlaybackMode } from 'src/frontend/stores/UiStore';

interface ItemProps {
  file: ClientFile;
  mounted: boolean;
  // Will use the original image instead of the thumbnail
  forceNoThumbnail?: boolean;
  hovered?: boolean;
  galleryVideoPlaybackMode?: GalleryVideoPlaybackMode;
  isSlideMode?: boolean;
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
    transform: [width, height, top, left],
  }: MasonryItemProps) => {
    const { uiStore, fileStore } = useStore();
    const [isHovered, setIsHovered] = useState(false);
    const style = { height, width, transform: `translate(${left}px,${top}px)` };
    const eventManager = useMemo(() => new CommandDispatcher(file), [file]);

    const handleMouseEnter = useCallback((): void => {
      setIsHovered(true);
    }, []);
    const handleMouseLeave = useCallback((): void => {
      setIsHovered(false);
    }, []);

    const cellContent = () => (
      <div data-masonrycell aria-selected={uiStore.fileSelection.has(file)} style={style}>
        {uiStore.isRefreshing ? null : renderThumbnailContent()}
      </div>
    );

    const renderThumbnailContent = () => (
      <>
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
          onMouseEnter={
            uiStore.galleryVideoPlaybackMode === 'hover' &&
            (isFileExtensionVideo(file.extension) || file.extension === 'gif')
              ? handleMouseEnter
              : (): void => {}
          }
          onMouseLeave={
            uiStore.galleryVideoPlaybackMode === 'hover' &&
            (isFileExtensionVideo(file.extension) || file.extension === 'gif')
              ? handleMouseLeave
              : (): void => {}
          }
        >
          <Thumbnail
            mounted={mounted}
            file={file}
            forceNoThumbnail={forceNoThumbnail}
            hovered={isHovered}
            galleryVideoPlaybackMode={uiStore.galleryVideoPlaybackMode}
            isSlideMode={uiStore.isSlideMode}
          />
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

        {(uiStore.isThumbnailFilenameOverlayEnabled ||
          uiStore.isThumbnailResolutionOverlayEnabled) && (
          <ThumbnailOverlay
            file={file}
            showFilename={uiStore.isThumbnailFilenameOverlayEnabled}
            showResolution={uiStore.isThumbnailResolutionOverlayEnabled}
          />
        )}

        {/* Show tags when the option is enabled, or when the file is selected */}
        {(uiStore.isThumbnailTagOverlayEnabled || uiStore.fileSelection.has(file)) &&
          (!mounted ? (
            <span className="thumbnail-tags" />
          ) : (
            <ThumbnailTags file={file} eventManager={eventManager} />
          ))}
      </>
    );
    return cellContent();
  },
);

// TODO: When a filename contains https://x/y/z.abc?323 etc., it can't be found
// e.g. %2F should be %252F on filesystems. Something to do with decodeURI, but seems like only on the filename - not the whole path
export const Thumbnail = observer(
  ({
    file,
    mounted,
    forceNoThumbnail,
    hovered,
    galleryVideoPlaybackMode,
    isSlideMode,
  }: ItemProps) => {
    const { uiStore, imageLoader } = useStore();
    const { thumbnailPath, isBroken } = file;
    const [playingGif, setPlayingGif] = useState<boolean | undefined>(undefined);
    // This will check whether a thumbnail exists, generate it if needed
    // this arguments work as dependencies to re-execute the promise
    const imageSource = usePromise(
      file,
      isBroken,
      mounted,
      thumbnailPath, // dependency to re-execute
      uiStore.isList || (!forceNoThumbnail && !playingGif),
      async (file, isBroken, mounted, thumbnailPath, useThumbnail) => {
        // If it is broken, only show thumbnail if it exists.
        if (!mounted || isBroken === true) {
          // fse.pathExists doesn't work if the path have url parameters
          if (await fse.pathExists(thumbnailPath.split('?')[0])) {
            return thumbnailPath;
          } else {
            throw new Error('No thumbnail available.');
          }
        }

        if (useThumbnail) {
          //this line will throw an exception if the thumbnail generation gets rejected / throw
          await imageLoader.ensureThumbnail(file);
          return getThumbnail(file);
        } else {
          const src = await imageLoader.getImageSrc(file);
          if (src !== undefined) {
            return src;
          } else {
            throw new Error('No thumbnail available.');
          }
        }
      },
    );

    // Even though all thumbnail errors should be caught in the above usePromise,
    // there is a chance that the image cannot be loaded, and we don't want to show broken image icons
    const fileId = file.id;
    const fileIdRef = useRef(fileId);
    const [loadError, setLoadError] = useState(false);
    const [loading, setLoading] = useState(true);
    const [src, setSrc] = useState(thumbnailPath);
    const handleImageError = useCallback(() => {
      if (fileIdRef.current === fileId) {
        setLoadError(true);
      }
    }, [fileId]);
    const handleLoad = useCallback(() => {
      if (fileIdRef.current === fileId) {
        setLoading(false);
      }
    }, [fileId]);
    useEffect(() => {
      fileIdRef.current = fileId;
      setLoadError(false);
    }, [fileId]);
    useEffect(() => {
      if (imageSource.tag === 'ready') {
        if ('ok' in imageSource.value) {
          setSrc(imageSource.value.ok);
        }
        setLoadError(false);
      }
    }, [imageSource.tag, imageSource]);

    // Plays and pauses gifs
    useEffect(() => {
      if (file.extension !== 'gif') {
        return;
      }
      if (hovered) {
        setPlayingGif(true);
      } else if (playingGif !== undefined) {
        setPlayingGif(false);
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [file.extension, hovered]);
    useEffect(() => {
      if (file.extension !== 'gif') {
        return;
      }
      if (galleryVideoPlaybackMode === 'auto') {
        setPlayingGif(true);
      } else if (playingGif !== undefined) {
        setPlayingGif(false);
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [file.extension, galleryVideoPlaybackMode]);

    // Plays and pauses video
    const thumbnailRef = useRef<HTMLVideoElement>(null);
    useEffect(() => {
      if (thumbnailRef.current === null || !isFileExtensionVideo(file.extension)) {
        return;
      }
      if (hovered) {
        thumbnailRef.current.play();
      } else {
        thumbnailRef.current.pause();
        thumbnailRef.current.currentTime = 0;
      }
    }, [thumbnailRef, hovered, file.extension]);
    useEffect(() => {
      if (thumbnailRef.current === null || !isFileExtensionVideo(file.extension)) {
        return;
      }
      if (galleryVideoPlaybackMode === 'auto') {
        thumbnailRef.current.play();
      } else {
        thumbnailRef.current.pause();
        thumbnailRef.current.currentTime = 0;
      }
    }, [thumbnailRef, galleryVideoPlaybackMode, file.extension]);

    // Pause video when slide mode, don't want to decode when video isn't visible
    useEffect(() => {
      if (thumbnailRef.current === null || !isFileExtensionVideo(file.extension)) {
        return;
      }
      if (isSlideMode) {
        thumbnailRef.current.pause();
      } else {
        if (galleryVideoPlaybackMode === 'auto') {
          thumbnailRef.current.play();
        }
      }
    }, [thumbnailRef, isSlideMode, file.extension, galleryVideoPlaybackMode]);

    const is_lowres = file.width < 320 || file.height < 320;
    const is_pixelated = is_lowres && uiStore.upscaleMode === 'pixelated';
    //const autoPlay = (galleryVideoPlaybackMode === 'auto' || hovered) ?? false;

    const props = useMemo(() => {
      const props = {
        src: encodeFilePath(src),
        'data-file-id': file.id,
        onError: handleImageError,
        style: {},
      };
      if (isFileExtensionVideo(file.extension)) {
        return {
          ...props,
          muted: true,
          loop: true,
          onCanPlay: handleLoad,
          //autoPlay: autoPlay, //maybe is not necesary because autoplaying is already handled with useEffect hooks
        };
      } else {
        return {
          ...props,
          alt: '',
          onLoad: handleLoad,
          style: is_pixelated ? { imageRendering: 'pixelated' as any } : {},
        };
      }
    }, [src, file.id, file.extension, handleImageError, handleLoad, is_pixelated]);

    if (!mounted) {
      return <span className="image-placeholder" />;
    }
    if (loadError) {
      return <span className="image-loading" />;
    }
    if (imageSource.tag === 'ready' && 'err' in imageSource.value) {
      return <span className="image-error" />;
    }
    return (
      <>
        {isFileExtensionVideo(file.extension) ? (
          <video ref={thumbnailRef} {...props} style={{ display: loading ? 'none' : 'block' }} />
        ) : (
          <img {...props} style={{ ...props.style, display: loading ? 'none' : 'block' }} />
        )}
        {loading && <span className="image-loading" />}
      </>
    );
  },
);

const getThumbnail = action((file: ClientFile) => file.thumbnailPath);

export const ThumbnailTags = observer(
  ({ file, eventManager }: { file: ClientFile; eventManager: CommandDispatcher }) => {
    return (
      <span
        className="thumbnail-tags"
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
        {Array.from(file.inheritedTags, (tag) => (
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
    return (
      <Tag
        text={tag.name}
        color={tag.viewColor}
        tooltip={tag.path
          .map((v) => (v.startsWith('#') ? '&nbsp;<b>' + v.slice(1) + '</b>&nbsp;' : v))
          .join(' › ')}
        onContextMenu={(e) => onContextMenu(e, tag)}
      />
    );
  },
);

const ThumbnailOverlay = ({
  file,
  showFilename,
  showResolution,
}: {
  file: ClientFile;
  showFilename: boolean;
  showResolution: boolean;
}) => {
  const title = `${ellipsize(file.absolutePath, 80, 'middle')}, ${file.width}x${
    file.height
  }, ${humanFileSize(file.size)}`;

  return (
    <div className="thumbnail-overlay" data-tooltip={title}>
      {showFilename && (
        <div className="thumbnail-filename" data-tooltip={title}>
          {file.name}
        </div>
      )}

      {showResolution && (
        <div className="thumbnail-resolution" data-tooltip={title}>
          {file.width}⨯{file.height}
        </div>
      )}
    </div>
  );
};
