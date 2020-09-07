import React, { useState, useEffect, useCallback, useMemo, useContext } from 'react';
import { shell } from 'electron';
import { observer } from 'mobx-react-lite';
import {
  Tag,
  ContextMenuTarget,
  Menu,
  MenuItem,
  H4,
  Tooltip,
  Card,
  Button,
  ButtonGroup,
  MenuDivider,
} from '@blueprintjs/core';

import { ClientFile } from '../../../entities/File';
import { ClientTag } from '../../../entities/Tag';
import IconSet from 'components/Icons';
import ImageInfo from '../../components/ImageInfo';
import StoreContext, { withRootstore, IRootStoreProp } from '../../contexts/StoreContext';
import { DnDType, DnDAttribute } from '../Outliner/TagsPanel/DnD';
import { getClassForBackground } from '../../utils';
import { ensureThumbnail } from '../../ThumbnailGeneration';
import { RendererMessenger } from 'src/Messaging';
import UiStore from '../../stores/UiStore';
import { SortMenuItems } from '../Toolbar/ContentToolbar';
import FileStore from '../../stores/FileStore';

const ThumbnailTag = ({ name, color }: { name: string; color: string }) => {
  const colClass = useMemo(() => (color ? getClassForBackground(color) : 'color-white'), [color]);
  return (
    <Tag intent="primary" style={{ backgroundColor: color }}>
      <span className={colClass}>{name}</span>
    </Tag>
  );
};

interface IThumbnailTags {
  tags: ClientTag[];
  onClick: (event: React.MouseEvent<HTMLSpanElement, MouseEvent>) => void;
  onDoubleClick: (event: React.MouseEvent<HTMLSpanElement, MouseEvent>) => void;
}

const ThumbnailTags = observer(({ tags, onClick, onDoubleClick }: IThumbnailTags) => (
  <span className="thumbnail-tags" onClick={onClick} onDoubleClick={onDoubleClick}>
    {tags.map((tag) => (
      <ThumbnailTag key={tag.id} name={tag.name} color={tag.viewColor} />
    ))}
  </span>
));

interface IThumbnailDecoration {
  showDetails?: boolean;
  file: ClientFile;
  uiStore: UiStore;
  tags: JSX.Element;
}

const ThumbnailDecoration = observer(
  ({ showDetails, file, uiStore, tags }: IThumbnailDecoration) => {
    if (file.isBroken && showDetails) {
      return (
        <Card>
          <p>The file {file.name} could not be found.</p>
          <p>Would you like to remove it from your library?</p>
          <ButtonGroup>
            <Button
              text="Remove"
              intent="danger"
              onClick={() => {
                uiStore.selectFile(file, true);
                uiStore.toggleToolbarFileRemover();
              }}
            />
          </ButtonGroup>
        </Card>
      );
    } else {
      return (
        <>
          {showDetails && (
            <>
              <H4>{file.filename}</H4>
              <ImageInfo file={file} />
            </>
          )}
          {tags}
        </>
      );
    }
  },
);

interface IGalleryItemProps extends IRootStoreProp {
  file: ClientFile;
  isSelected: boolean;
  onClick: (file: ClientFile, e: React.MouseEvent) => void;
  onDoubleClick?: (file: ClientFile, e: React.MouseEvent) => void;
  showDetails?: boolean;
}

const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
  if (event.dataTransfer.types.includes(DnDType.Tag)) {
    event.dataTransfer.dropEffect = 'link';
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.dataset[DnDAttribute.Target] = 'true';
  }
};

const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
  if (event.dataTransfer.types.includes(DnDType.Tag)) {
    event.dataTransfer.dropEffect = 'none';
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.dataset[DnDAttribute.Target] = 'false';
  }
};

export const MissingImageFallback = ({ style }: { style?: React.CSSProperties }) => (
  <div style={style} className="image-error custom-icon-128">
    {IconSet.DB_ERROR}Could not load image
  </div>
);

const GalleryItem = observer(
  ({ file, isSelected, onClick, onDoubleClick, showDetails }: IGalleryItemProps) => {
    const { uiStore } = useContext(StoreContext);

    const handleDrop = useCallback(
      (event: React.DragEvent<HTMLDivElement>) => {
        if (event.dataTransfer.types.includes(DnDType.Tag)) {
          event.dataTransfer.dropEffect = 'none';
          const ctx = uiStore.getTagContextItems(event.dataTransfer.getData(DnDType.Tag));
          ctx.tags.forEach((tag) => file.addTag(tag.id));
          ctx.collections.forEach((col) => col.getTagsRecursively().forEach(file.addTag));
          event.currentTarget.dataset[DnDAttribute.Target] = 'false';
        }
      },
      [file, uiStore],
    );

    const handleClickImg = useCallback((e) => onClick(file, e), [file, onClick]);
    const handleDoubleClickImg = useCallback((e) => onDoubleClick && onDoubleClick(file, e), [
      file,
      onDoubleClick,
    ]);

    // Initially, we assume the thumbnail exists
    const [isThumbnailReady, setThumbnailReady] = useState(true);
    const [isThumbnailGenerating, setThumbnailGenerating] = useState(false);

    const imagePath = uiStore.isSlideMode ? file.absolutePath : file.thumbnailPath;

    useEffect(() => {
      // This will check whether a thumbnail exists, generate it if needed
      ensureThumbnail(file, uiStore.thumbnailDirectory).then((exists) => {
        if (!exists) {
          setThumbnailReady(false);
          if (!file.isBroken) {
            // can't genarate thumbnail if img doesn't exist
            setThumbnailGenerating(true);
          }
        }
      });
    }, [file, uiStore.thumbnailDirectory]);

    // The thumbnailPath of an image is always set, but may not exist yet.
    // When the thumbnail is finished generating, the path will be changed to `${thumbnailPath}?v=1`,
    // which we detect here to know the thumbnail is ready
    useEffect(() => {
      if (imagePath.endsWith('?v=1')) {
        setThumbnailReady(true);
        setThumbnailGenerating(false);
      }
    }, [imagePath]);

    // When the thumbnail cannot be loaded, display an error
    const handleImageError = useCallback(
      (err: any) => {
        console.log('Could not load image:', imagePath, err);
        setThumbnailReady(false);
      },
      [imagePath],
    );

    const handleDragStart = useCallback(
      async (e: React.DragEvent<HTMLImageElement>) => {
        // If file is selected, add all selected items to the drag event, for exporting e.g. to your file explorer or programs like PureRef
        // Creating an event in the main process turned out to be the most robust, did many experiments with drag event content types.
        // Creating a drag event with multiple images did not work correctly from the browser side (e.g. only limited to thumbnails, not full images)
        if (isSelected && uiStore.fileSelection.size > 1) {
          e.preventDefault();
          RendererMessenger.startDragExport({
            absolutePaths: uiStore.clientFileSelection.map((f) => f.absolutePath),
          });
        } else {
          RendererMessenger.startDragExport({ absolutePaths: [file.absolutePath] });
        }

        // However, from the main process, there is no way to attach some information to indicate it's an "internal event" that shouldn't trigger the drop overlay
        // So we can store the date when the event starts... Hacky but it works :)
        (window as any).internalDragStart = new Date();
      },
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [file, isSelected, uiStore.fileSelection, uiStore.fileSelection.size],
    );

    // TODO: When a filename contains https://x/y/z.abc?323 etc., it can't be found
    // e.g. %2F should be %252F on filesystems. Something to do with decodeURI, but seems like only on the filename - not the whole path

    return (
      <div
        className="thumbnail"
        aria-selected={isSelected}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <Tooltip content={file.name} hoverOpenDelay={1000}>
          <div
            onClick={handleClickImg}
            className={`thumbnail-img${file.isBroken ? ' thumbnail-broken' : ''}`}
            onDoubleClick={handleDoubleClickImg}
            onDragStart={handleDragStart}
          >
            {isThumbnailReady ? (
              // Show image when it has been loaded
              <img src={imagePath} onError={handleImageError} alt="" />
            ) : isThumbnailGenerating ? (
              // If it's being generated, show a placeholder
              <div className="donut-loading" />
            ) : (
              // Show an error it it could not be loaded
              <MissingImageFallback />
            )}
            {file.isBroken && !showDetails && (
              <div className="thumbnail-broken-overlay">
                <Tooltip content="This image could not be found.">
                  <span
                    onClick={(e) => {
                      e.stopPropagation(); // prevent image click event
                      uiStore.selectFile(file, true);
                      uiStore.toggleToolbarFileRemover();
                    }}
                  >
                    {IconSet.WARNING_BROKEN_LINK}
                  </span>
                </Tooltip>
              </div>
            )}
          </div>
        </Tooltip>
        <ThumbnailDecoration
          showDetails={showDetails}
          file={file}
          uiStore={uiStore}
          tags={
            <ThumbnailTags
              tags={file.clientTags}
              onClick={handleClickImg}
              onDoubleClick={handleDoubleClickImg}
            />
          }
        />
      </div>
    );
  },
);

export const GeneralGalleryContextMenuItems = ({
  uiStore,
  fileStore,
}: {
  uiStore: UiStore;
  fileStore: FileStore;
}) => (
  <>
    <MenuItem icon={IconSet.VIEW_GRID} text="View method...">
      <MenuItem
        onClick={uiStore.setMethodList}
        icon={IconSet.VIEW_LIST}
        active={uiStore.isList}
        text="List"
      />
      <MenuItem
        onClick={uiStore.setMethodGrid}
        icon={IconSet.VIEW_GRID}
        active={uiStore.isGrid}
        text="Grid"
      />
      <MenuItem icon="lock" text="Masonry" disabled />
    </MenuItem>
    <MenuItem icon={IconSet.FILTER_NAME_DOWN} text="Sort by...">
      <SortMenuItems
        fileOrder={fileStore.fileOrder}
        orderBy={fileStore.orderBy}
        orderFilesBy={fileStore.orderFilesBy}
        switchFileOrder={fileStore.switchFileOrder}
      />
    </MenuItem>
  </>
);

const GalleryItemContextMenu = ({ file, rootStore }: { file: ClientFile } & IRootStoreProp) => {
  const { uiStore, fileStore } = rootStore;
  const handleViewFullSize = useCallback(() => {
    uiStore.selectFile(file, true);
    uiStore.toggleSlideMode();
  }, [file, uiStore]);
  const handlePreviewWindow = useCallback(() => {
    if (!uiStore.fileSelection.has(file.id)) {
      uiStore.selectFile(file, true);
    }
    uiStore.openPreviewWindow();
  }, [file, uiStore]);
  const handleOpen = useCallback(() => shell.openItem(file.absolutePath), [file.absolutePath]);
  const handleOpenFileExplorer = useCallback(() => shell.showItemInFolder(file.absolutePath), [
    file.absolutePath,
  ]);
  const handleInspect = useCallback(() => {
    uiStore.clearFileSelection();
    uiStore.selectFile(file);
    if (!uiStore.isInspectorOpen) {
      uiStore.toggleInspector();
    }
  }, [file, uiStore]);

  if (file.isBroken) {
    return (
      <Menu>
        <MenuItem
          onClick={fileStore.fetchMissingFiles}
          text="Open Recovery Panel"
          icon={IconSet.WARNING_BROKEN_LINK}
          disabled={fileStore.showsMissingContent}
        />
        <MenuItem onClick={uiStore.toggleToolbarFileRemover} text="Delete" icon={IconSet.DELETE} />
        <MenuDivider />
        <GeneralGalleryContextMenuItems uiStore={uiStore} fileStore={fileStore} />
      </Menu>
    );
  }

  return (
    <Menu>
      <MenuItem onClick={handleViewFullSize} text="View at Full Size" icon="zoom-in" />
      <MenuItem
        onClick={handlePreviewWindow}
        text="Open In Preview Window"
        icon={IconSet.PREVIEW}
      />
      <MenuItem onClick={handleInspect} text="Inspect" icon={IconSet.INFO} />

      <MenuDivider />
      <GeneralGalleryContextMenuItems uiStore={uiStore} fileStore={fileStore} />
      <MenuDivider />

      <MenuItem onClick={handleOpen} text="Open External" icon={IconSet.OPEN_EXTERNAL} />
      <MenuItem
        onClick={handleOpenFileExplorer}
        text="Reveal in File Browser"
        icon={IconSet.FOLDER_CLOSE}
      />
    </Menu>
  );
};

/** Wrapper that adds a context menu (with right click) */
@ContextMenuTarget
class GalleryItemWithContextMenu extends React.PureComponent<
  IGalleryItemProps,
  { isContextMenuOpen: boolean; _isMounted: boolean }
> {
  state = {
    isContextMenuOpen: false,
    _isMounted: false,
  };

  constructor(props: IGalleryItemProps) {
    super(props);
  }

  componentDidMount() {
    this.setState({ ...this.state, _isMounted: true });
  }

  componentWillUnmount() {
    this.setState({ ...this.state, _isMounted: false });
  }

  render() {
    return (
      // Context menu/root element must supports the "contextmenu" event and the onContextMenu prop
      <span className={this.state.isContextMenuOpen ? 'contextMenuTarget' : ''}>
        <GalleryItem {...this.props} />
      </span>
    );
  }

  renderContextMenu() {
    this.updateState({ isContextMenuOpen: true });
    return <GalleryItemContextMenu file={this.props.file} rootStore={this.props.rootStore} />;
  }

  onContextMenuClose = () => {
    this.updateState({ isContextMenuOpen: false });
  };

  private updateState = (updatableProp: any) => {
    if (this.state._isMounted) {
      this.setState(updatableProp);
    }
  };
}

// A simple version of the GalleryItem, only rendering the minimally required info (thumbnail + name)
const SimpleGalleryItem = observer(({ file, showDetails, isSelected }: IGalleryItemProps) => {
  return (
    <div className="thumbnail" aria-selected={isSelected}>
      <div className="thumbnail-img">
        <img src={file.thumbnailPath} alt="" />
      </div>
      {showDetails && (
        <>
          <H4>{file.filename}</H4>
          <ImageInfo file={file} />
          <span className="thumbnail-tags" />
        </>
      )}
    </div>
  );
});

const DelayedGalleryItem = (props: IGalleryItemProps) => {
  const [showSimple, setShowSimple] = useState(true);
  useEffect(() => {
    const timeout = setTimeout(() => setShowSimple(false), 300);
    return () => clearTimeout(timeout);
  });
  return showSimple ? <SimpleGalleryItem {...props} /> : <GalleryItemWithContextMenu {...props} />;
};

export default observer(withRootstore(DelayedGalleryItem));
