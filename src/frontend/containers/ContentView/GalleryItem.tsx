import React, { useState, useEffect, useRef } from 'react';
import { observer } from 'mobx-react-lite';

import { ensureThumbnail } from '../../ThumbnailGeneration';

import { ClientFile } from 'src/entities/File';

import UiStore from '../../stores/UiStore';
import FileStore from '../../stores/FileStore';

import { Button, ButtonGroup, IconSet, Tag } from 'widgets';
import { Tooltip } from 'widgets/popovers';

import ImageInfo from '../../components/ImageInfo';
import { ITransform } from './Masonry/masonry.worker';
import { DnDAttribute, DnDTagType } from 'src/frontend/contexts/TagDnDContext';

interface ICell {
  file: ClientFile;
  mounted: boolean;
  uiStore: UiStore;
  // Will use the original image instead of the thumbnail
  forceNoThumbnail?: boolean;
  submitCommand: (command: GalleryCommand) => void;
}

type IListCell = ICell;

export const ListCell = observer(({ file, mounted, uiStore, submitCommand }: IListCell) => (
  <div role="gridcell" tabIndex={-1} aria-selected={uiStore.fileSelection.has(file)}>
    <ThumbnailContainer file={file} submitCommand={submitCommand}>
      <Thumbnail uiStore={uiStore} mounted={!mounted} file={file} />
    </ThumbnailContainer>
    {file.isBroken === true ? (
      <div>
        <p>The file {file.name} could not be found.</p>
        <p>Would you like to remove it from your library?</p>
        <ButtonGroup>
          <Button
            text="Remove"
            styling="outlined"
            onClick={() => {
              uiStore.selectFile(file, true);
              uiStore.openToolbarFileRemover();
            }}
          />
        </ButtonGroup>
      </div>
    ) : (
      <>
        <h2>{file.filename}</h2>
        <ImageInfo suspended={!mounted} file={file} />
      </>
    )}
    {file.tags.size == 0 || !mounted ? <span className="thumbnail-tags" /> : <Tags file={file} />}
  </div>
));

interface IGridCell extends ICell {
  colIndex: number;
  fileStore: FileStore;
}

export const GridCell = observer(
  ({ file, colIndex, mounted, uiStore, fileStore, submitCommand }: IGridCell) => {
    const portalTriggerRef = useRef<HTMLSpanElement>(null);
    return (
      <div
        role="gridcell"
        tabIndex={-1}
        aria-colindex={colIndex}
        aria-selected={uiStore.fileSelection.has(file)}
      >
        <ThumbnailContainer file={file} submitCommand={submitCommand}>
          <Thumbnail uiStore={uiStore} mounted={!mounted} file={file} />
        </ThumbnailContainer>
        {file.isBroken === true && (
          <Tooltip
            content="This image could not be found."
            trigger={
              <span
                ref={portalTriggerRef}
                className="thumbnail-broken-overlay"
                onClick={fileStore.fetchMissingFiles}
              >
                {IconSet.WARNING_BROKEN_LINK}
              </span>
            }
            portalTriggerRef={portalTriggerRef}
          />
        )}
        {/* Show tags when the option is enabled, or when the file is selected */}
        {(uiStore.isThumbnailTagOverlayEnabled || uiStore.fileSelection.has(file)) &&
          (file.tags.size == 0 || !mounted ? (
            <span className="thumbnail-tags" />
          ) : (
            <Tags file={file} />
          ))}
      </div>
    );
  },
);

interface IMasonryCell extends ICell {
  fileStore: FileStore;
  forceNoThumbnail: boolean;
  transform: ITransform;
}

export const MasonryCell = observer(
  ({
    file,
    mounted,
    uiStore,
    fileStore,
    forceNoThumbnail,
    transform: { height, width, left, top },
    submitCommand,
    ...restProps
  }: IMasonryCell & React.HTMLAttributes<HTMLDivElement>) => {
    const style = { height, width, transform: `translate(${left}px,${top}px)` };
    const portalTriggerRef = useRef<HTMLSpanElement>(null);
    return (
      <div
        data-masonrycell
        tabIndex={-1}
        aria-selected={uiStore.fileSelection.has(file)}
        style={style}
        {...restProps}
      >
        <ThumbnailContainer file={file} submitCommand={submitCommand}>
          <Thumbnail
            uiStore={uiStore}
            mounted={!mounted}
            file={file}
            forceNoThumbnail={forceNoThumbnail}
          />
        </ThumbnailContainer>
        {file.isBroken === true && (
          <Tooltip
            content="This image could not be found."
            trigger={
              <span
                ref={portalTriggerRef}
                className="thumbnail-broken-overlay"
                onClick={fileStore.fetchMissingFiles}
              >
                {IconSet.WARNING_BROKEN_LINK}
              </span>
            }
            portalTriggerRef={portalTriggerRef}
          />
        )}
        {/* Show tags when the option is enabled, or when the file is selected */}
        {(uiStore.isThumbnailTagOverlayEnabled || uiStore.fileSelection.has(file)) &&
          (file.tags.size == 0 || !mounted ? (
            <span className="thumbnail-tags" />
          ) : (
            <Tags file={file} />
          ))}
      </div>
    );
  },
);

interface IThumbnailContainer {
  file: ClientFile;
  children: React.ReactNode;
  submitCommand: (command: GalleryCommand) => void;
}

const ThumbnailContainer = observer(({ file, children, submitCommand }: IThumbnailContainer) => {
  return (
    <div
      className={`thumbnail${file.isBroken ? ' thumbnail-broken' : ''}`}
      onClick={(e) => {
        e.stopPropagation();
        submitCommand({
          selector: GallerySelector.Click,
          payload: [file, e.ctrlKey || e.metaKey, e.shiftKey],
        });
      }}
      onDoubleClick={() => submitCommand({ selector: GallerySelector.DoubleClick, payload: file })}
      onContextMenu={(e) => {
        e.stopPropagation();
        e.preventDefault();
        submitCommand({
          selector: GallerySelector.ContextMenu,
          payload: [file, e.clientX, e.clientY],
        });
      }}
      onDragStart={(e) => {
        e.stopPropagation();
        e.preventDefault();
        submitCommand({ selector: GallerySelector.DragStart, payload: file });
      }}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={(e) => {
        e.stopPropagation();
        submitCommand({ selector: GallerySelector.Drop, payload: file });
        const thumbnail = e.currentTarget as HTMLElement;
        e.dataTransfer.dropEffect = 'none';
        thumbnail.dataset[DnDAttribute.Target] = 'false';
        thumbnail.dataset[DnDAttribute.Target] = 'false';

        const galleryContent = thumbnail.closest('#gallery-content');
        if (galleryContent) {
          galleryContent.classList.remove('selected-file-dropping');
        }
      }}
    >
      {children}
    </div>
  );
});

function handleDragEnter(e: React.DragEvent<HTMLDivElement>) {
  if (e.dataTransfer.types.includes(DnDTagType)) {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'link';
    (e.target as HTMLElement).dataset[DnDAttribute.Target] = 'true';
  }
}

function handleDragOver(e: React.DragEvent<HTMLDivElement>) {
  if (e.dataTransfer.types.includes(DnDTagType)) {
    e.stopPropagation();
    e.preventDefault();

    // If selected, apply class to gallery-content to mark all files as yellow ->
    // indicating tag will be applied to all selected files
    // TODO:: This should be based on application state, not on DOM attributes... But the whole DnD approach currently works like this 🤷
    // it appears sometimes the dragLeave is fired after the next dragEnter when dragging quickly in between thumbnails
    const thumbnail = e.target as HTMLElement;
    if ((thumbnail.parentElement as HTMLElement).getAttribute('aria-selected') === 'true') {
      const galleryContent = thumbnail.closest('#gallery-content');
      if (galleryContent && !galleryContent.classList.contains('selected-file-dropping')) {
        galleryContent.classList.add('selected-file-dropping');
      }
    }
  }
}

function handleDragLeave(e: React.DragEvent<HTMLDivElement>) {
  if (e.dataTransfer.types.includes(DnDTagType)) {
    const thumbnail = e.target as HTMLElement;
    e.stopPropagation();
    e.preventDefault();
    e.dataTransfer.dropEffect = 'none';
    thumbnail.dataset[DnDAttribute.Target] = 'false';

    if ((thumbnail.parentElement as HTMLElement).getAttribute('aria-selected') === 'true') {
      const galleryContent = thumbnail.closest('#gallery-content');
      if (galleryContent) {
        galleryContent.classList.remove('selected-file-dropping');
      }
    }
  }
}

const enum ThumbnailState {
  Ok,
  Loading,
  Error,
}

type IThumbnail = Omit<ICell, 'submitCommand'>;

// TODO: When a filename contains https://x/y/z.abc?323 etc., it can't be found
// e.g. %2F should be %252F on filesystems. Something to do with decodeURI, but seems like only on the filename - not the whole path
const Thumbnail = observer(({ file, mounted, uiStore, forceNoThumbnail }: IThumbnail) => {
  const { thumbnailDirectory } = uiStore;
  const { thumbnailPath, isBroken } = file;

  // Initially, we assume the thumbnail exists
  const [state, setState] = useState(ThumbnailState.Ok);

  // This will check whether a thumbnail exists, generate it if needed
  useEffect(() => {
    let isMounted = true;
    if (!mounted && isBroken === true) {
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
  }, [file, isBroken, mounted, thumbnailDirectory]);

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
        src={forceNoThumbnail ? file.absolutePath : thumbnailPath}
        onError={handleImageError}
        alt=""
      />
    );
  } else if (state === ThumbnailState.Loading) {
    return <div className="donut-loading" />;
  } else {
    return <MissingImageFallback />;
  }
});

export const MissingImageFallback = ({ style }: { style?: React.CSSProperties }) => (
  <div style={style} className="image-error custom-icon-128">
    {IconSet.DB_ERROR}Could not load image
  </div>
);

const Tags = observer(({ file }: { file: ClientFile }) => (
  <span className="thumbnail-tags">
    {Array.from(file.tags, (tag) => (
      <Tag key={tag.id} text={tag.name} color={tag.viewColor} />
    ))}
  </span>
));

export const enum GallerySelector {
  Click = 'click',
  DoubleClick = 'doubleClick',
  ContextMenu = 'contextMenu',
  DragStart = 'dragStart',
  Drop = 'drop',
}

export interface ICommand<S, P> {
  selector: S;
  payload: P;
}

export type GalleryCommand =
  | ICommand<GallerySelector.Click, [file: ClientFile, metaKey: boolean, shiftKey: boolean]>
  | ICommand<GallerySelector.DoubleClick, ClientFile>
  | ICommand<GallerySelector.ContextMenu, [file: ClientFile, x: number, y: number]>
  | ICommand<GallerySelector.DragStart, ClientFile>
  | ICommand<GallerySelector.Drop, ClientFile>;
