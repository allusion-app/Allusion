import React, { useState, useEffect, useMemo } from 'react';
import { observer } from 'mobx-react-lite';
import { ClientFile, IFile } from 'src/entities/File';
import { ellipsize, encodeFilePath, formatDateTime, humanFileSize } from 'src/frontend/utils';
import { IconButton, IconSet, Tag } from 'widgets';
import FileStore from '../../stores/FileStore';
import UiStore from '../../stores/UiStore';
import { ensureThumbnail } from '../../ThumbnailGeneration';
import { ITransform } from './Masonry/MasonryWorkerAdapter';
import { DnDAttribute, DnDTagType } from 'src/frontend/contexts/TagDnDContext';
import { useTooltip } from 'widgets/popovers';
import { ClientTag } from 'src/entities/Tag';

interface ICell {
  file: ClientFile;
  mounted: boolean;
  uiStore: UiStore;
  // Will use the original image instead of the thumbnail
  forceNoThumbnail?: boolean;
  submitCommand: (command: GalleryCommand) => void;
}

interface IListColumn {
  title: string;
  // Also indicates whether this column _can_ be sorted on
  sortKey?: keyof IFile;
  // cellContent: (props: ICellContentProps) => ReactNode;
}

export const listColumns: IListColumn[] = [
  {
    title: 'Name',
    sortKey: 'name',
    // Placeholder for when we want dynamic table (e.g. draggable/toggleable columns)
    // cellContent: function NameCell({ file, isMounted, uiStore }: ICellContentProps) {
    //   return (
    //     <div key={`${file.id}-name`}>
    //       <div className={`thumbnail${file.isBroken ? ' thumbnail-broken' : ''}`}>
    //         {isMounted ? (
    //           <Thumbnail uiStore={uiStore} mounted={isMounted} file={file} />
    //         ) : (
    //           <div className="thumbnail-placeholder" />
    //         )}
    //       </div>{' '}
    //       <span className="filename">{file.name}</span>
    //     </div>
    //   );
    // },
  },
  { title: 'Dimensions' },
  { title: 'Date added', sortKey: 'dateAdded' },
  { title: 'Size', sortKey: 'size' },
  { title: 'Tags' },
];

export const ListCell = observer(({ file, mounted, uiStore, submitCommand }: ICell) => {
  const eventHandlers = useMemo(() => new GalleryEventHandler(file, submitCommand).handlers, [
    file,
    submitCommand,
  ]);
  return (
    <div
      role="gridcell"
      tabIndex={-1}
      aria-selected={uiStore.fileSelection.has(file)}
      {...eventHandlers}
    >
      {/* Filename */}
      <div key={`${file.id}-name`}>
        <ThumbnailContainer file={file} submitCommand={submitCommand}>
          {mounted ? (
            <Thumbnail uiStore={uiStore} mounted={mounted} file={file} />
          ) : (
            <div className="thumbnail-placeholder" />
          )}
        </ThumbnailContainer>
        <span className="filename">{file.name}</span>
      </div>

      {/* Dimensions */}
      <div>
        {file.width} x {file.height}
      </div>

      {/* Import date */}
      <div>{formatDateTime(file.dateAdded)}</div>

      {/* Size */}
      <div>{humanFileSize(file.size)}</div>

      {/* Tags */}
      <div>
        <ThumbnailTags file={file} />
      </div>

      {/* TODO: Broken/missing indicator. Red/orange-ish background? */}
    </div>
  );
});

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
  }: IMasonryCell & React.HTMLAttributes<HTMLDivElement>) => {
    const style = { height, width, transform: `translate(${left}px,${top}px)` };

    return (
      <div
        data-masonrycell
        tabIndex={-1}
        aria-selected={uiStore.fileSelection.has(file)}
        style={style}
      >
        <ThumbnailContainer file={file} submitCommand={submitCommand}>
          <Thumbnail
            uiStore={uiStore}
            mounted={!mounted}
            file={file}
            forceNoThumbnail={forceNoThumbnail}
          />
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
  onContextMenu(e: React.MouseEvent<HTMLElement>) {
    e.stopPropagation();
    e.preventDefault();
    this.submitCommand({
      selector: GallerySelector.ContextMenu,
      payload: [this.file, e.clientX, e.clientY],
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
    const thumbnail = e.currentTarget as HTMLElement;
    e.dataTransfer.dropEffect = 'none';
    e.currentTarget.dataset[DnDAttribute.Target] = 'false';

    const galleryContent = thumbnail.closest('#gallery-content');
    if (galleryContent) {
      galleryContent.classList.remove('selected-file-dropping');
    }
  }
  // TODO: Doesn't seem to every be firing. Bug: Pressing escape while dropping tag on gallery item
  onDragEnd(e: React.DragEvent<HTMLElement>) {
    e.stopPropagation();
    const thumbnail = e.currentTarget as HTMLElement;
    e.dataTransfer.dropEffect = 'none';
    e.currentTarget.dataset[DnDAttribute.Target] = 'false';

    const galleryContent = thumbnail.closest('#gallery-content');
    if (galleryContent) {
      galleryContent.classList.remove('selected-file-dropping');
    }
  }
}

interface IThumbnailContainer {
  file: ClientFile;
  children: React.ReactNode;
  submitCommand: (command: GalleryCommand) => void;
}

const ThumbnailContainer = observer(({ file, children, submitCommand }: IThumbnailContainer) => {
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
        src={encodeFilePath(forceNoThumbnail ? file.absolutePath : thumbnailPath)}
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

const ThumbnailTags = observer(
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
          <TagWithHint key={tag.id} tag={tag} />
        ))}
      </span>
    );
  },
);

const TagWithHint = observer(({ tag }: { tag: ClientTag }) => {
  const { onShow, onHide } = useTooltip(tag.treePath.map((t) => t.name).join(' › '));

  return (
    <Tag
      text={tag.name}
      color={tag.viewColor}
      onMouseOutCapture={onHide}
      onMouseOverCapture={onShow}
    />
  );
});

const ThumbnailFilename = ({ file }: { file: ClientFile }) => {
  const title = `${ellipsize(file.absolutePath, 80, 'middle')}, ${file.width}x${
    file.height
  }, ${humanFileSize(file.size)}`;
  const { onShow, onHide } = useTooltip(title);

  return (
    <div className="thumbnail-filename" onMouseOutCapture={onHide} onMouseOverCapture={onShow}>
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
  | ICommand<GallerySelector.ContextMenu, [file: ClientFile, x: number, y: number]>
  | ICommand<GallerySelector.ContextMenuSlide, [file: ClientFile, x: number, y: number]>
  | ICommand<GallerySelector.DragStart, ClientFile>
  | ICommand<GallerySelector.DragOver, ClientFile>
  | ICommand<GallerySelector.DragLeave, undefined>
  | ICommand<GallerySelector.Drop, ClientFile>;
