import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { observer } from 'mobx-react-lite';
import { ClientFile } from 'src/entities/File';
import { ellipsize, encodeFilePath, humanFileSize } from 'src/frontend/utils';
import { IconButton, IconSet, Tag } from 'widgets';
import { ensureThumbnail } from '../../ThumbnailGeneration';
import { ITransform } from './Masonry/MasonryWorkerAdapter';
import { DnDAttribute, DnDTagType } from 'src/frontend/contexts/TagDnDContext';
import { ClientTag } from 'src/entities/Tag';
import { useStore } from 'src/frontend/contexts/StoreContext';

interface ICell {
  file: ClientFile;
  mounted: boolean;
  // Will use the original image instead of the thumbnail
  forceNoThumbnail?: boolean;
  submitCommand: (command: GalleryCommand) => void;
}

interface IMasonryCell extends ICell {
  forceNoThumbnail: boolean;
  transform: ITransform;
}

export const MasonryCell = observer(
  ({
    file,
    mounted,
    forceNoThumbnail,
    transform: { height, width, left, top },
    submitCommand,
  }: IMasonryCell & React.HTMLAttributes<HTMLDivElement>) => {
    const { uiStore, fileStore } = useStore();
    const style = { height, width, transform: `translate(${left}px,${top}px)` };

    return (
      <div data-masonrycell aria-selected={uiStore.fileSelection.has(file)} style={style}>
        <ThumbnailContainer file={file} submitCommand={submitCommand}>
          <Thumbnail mounted={!mounted} file={file} forceNoThumbnail={forceNoThumbnail} />
        </ThumbnailContainer>
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
            <ThumbnailTags file={file} submitCommand={submitCommand} />
          ))}
      </div>
    );
  },
);

export class GalleryEventHandler {
  constructor(public file: ClientFile, public submitCommand: (command: GalleryCommand) => void) {}
  get handlers() {
    return {
      onClick: this.onClick.bind(this),
      onDoubleClick: this.onDoubleClick.bind(this),
      onContextMenu: this.onContextMenu.bind(this),
      onDragStart: this.onDragStart.bind(this),
      onDragEnter: this.onDragEnter.bind(this),
      onDragOver: this.onDragOver.bind(this),
      onDragLeave: this.onDragLeave.bind(this),
      onDrop: this.onDrop.bind(this),
      onDragEnd: this.onDragEnd.bind(this),
    };
  }
  onClick(e: React.MouseEvent<HTMLElement>) {
    e.stopPropagation();
    this.submitCommand({
      selector: GallerySelector.Click,
      payload: [this.file, e.ctrlKey || e.metaKey, e.shiftKey],
    });
  }
  onDoubleClick() {
    this.submitCommand({ selector: GallerySelector.DoubleClick, payload: this.file });
  }
  onContextMenu(e: React.MouseEvent<HTMLElement>, tag?: ClientTag) {
    e.stopPropagation();
    e.preventDefault();
    this.submitCommand({
      selector: GallerySelector.ContextMenu,
      payload: [this.file, e.clientX, e.clientY, tag],
    });
  }
  onDragStart(e: React.MouseEvent<HTMLElement>) {
    e.stopPropagation();
    e.preventDefault();
    this.submitCommand({ selector: GallerySelector.DragStart, payload: this.file });
  }
  onDragEnter(e: React.DragEvent<HTMLElement>) {
    handleDragEnter(e);
  }
  onDragOver(e: React.DragEvent<HTMLElement>) {
    if (e.dataTransfer.types.includes(DnDTagType)) {
      e.stopPropagation();
      e.preventDefault();
      e.currentTarget.dataset[DnDAttribute.Target] = 'true';
      this.submitCommand({ selector: GallerySelector.DragOver, payload: this.file });
    }
  }
  onDragLeave(e: React.DragEvent<HTMLElement>) {
    if (e.dataTransfer.types.includes(DnDTagType)) {
      e.stopPropagation();
      e.preventDefault();
      e.dataTransfer.dropEffect = 'none';
      e.currentTarget.dataset[DnDAttribute.Target] = 'false';
      this.submitCommand({ selector: GallerySelector.DragOver, payload: this.file });
    }
  }
  onDrop(e: React.DragEvent<HTMLElement>) {
    e.stopPropagation();
    this.submitCommand({ selector: GallerySelector.Drop, payload: this.file });
    e.dataTransfer.dropEffect = 'none';
    e.currentTarget.dataset[DnDAttribute.Target] = 'false';
  }
  // TODO: Doesn't seem to every be firing. Bug: Pressing escape while dropping tag on gallery item
  onDragEnd(e: React.DragEvent<HTMLElement>) {
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'none';
    e.currentTarget.dataset[DnDAttribute.Target] = 'false';
  }
}

interface IThumbnailContainer {
  file: ClientFile;
  children: React.ReactNode;
  submitCommand: (command: GalleryCommand) => void;
}

export const ThumbnailContainer = observer((props: IThumbnailContainer) => {
  const { file, children, submitCommand } = props;
  const eventHandlers = useMemo(() => new GalleryEventHandler(file, submitCommand).handlers, [
    file,
    submitCommand,
  ]);
  return (
    <div className={`thumbnail${file.isBroken ? ' thumbnail-broken' : ''}`} {...eventHandlers}>
      {children}
    </div>
  );
});

function handleDragEnter(e: React.DragEvent<HTMLElement>) {
  if (e.dataTransfer.types.includes(DnDTagType)) {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'link';
    (e.target as HTMLElement).dataset[DnDAttribute.Target] = 'true';
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
export const Thumbnail = observer(({ file, mounted, forceNoThumbnail }: IThumbnail) => {
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
      setState((state) => (state === ThumbnailState.Loading ? state : ThumbnailState.Error));
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
  ({
    file,
    submitCommand,
  }: {
    file: ClientFile;
    submitCommand?: (command: GalleryCommand) => void;
  }) => {
    const eventHandlers = useMemo(
      () => submitCommand && new GalleryEventHandler(file, submitCommand).handlers,
      [file, submitCommand],
    );

    return (
      <span
        className="thumbnail-tags"
        onClick={eventHandlers?.onClick}
        onContextMenu={eventHandlers?.onContextMenu}
        onDoubleClick={eventHandlers?.onDoubleClick}
      >
        {Array.from(file.tags, (tag) => (
          <TagWithHint key={tag.id} tag={tag} onContextMenu={eventHandlers?.onContextMenu} />
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
    onContextMenu?: (e: React.MouseEvent<HTMLElement>, tag?: ClientTag | undefined) => void;
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

export const enum GallerySelector {
  Click = 'click',
  DoubleClick = 'doubleClick',
  ContextMenu = 'contextMenu',
  ContextMenuSlide = 'contextMenuSlide',
  DragStart = 'dragStart',
  DragOver = 'dragOver',
  DragLeave = 'dragLeave',
  Drop = 'drop',
}

export interface ICommand<S, P> {
  selector: S;
  payload: P;
}

export type GalleryCommand =
  | ICommand<GallerySelector.Click, [file: ClientFile, metaKey: boolean, shiftKey: boolean]>
  | ICommand<GallerySelector.DoubleClick, ClientFile>
  | ICommand<GallerySelector.ContextMenu, [file: ClientFile, x: number, y: number, tag?: ClientTag]>
  | ICommand<GallerySelector.ContextMenuSlide, [file: ClientFile, x: number, y: number]>
  | ICommand<GallerySelector.DragStart, ClientFile>
  | ICommand<GallerySelector.DragOver, ClientFile>
  | ICommand<GallerySelector.DragLeave, undefined>
  | ICommand<GallerySelector.Drop, ClientFile>;
