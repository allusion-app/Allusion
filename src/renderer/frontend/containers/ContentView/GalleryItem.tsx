import React, { useState, useEffect, useCallback, useMemo, useContext } from 'react';
import { shell } from 'electron';
import { observer } from 'mobx-react-lite';
import { Tag, H4, Card } from '@blueprintjs/core';

import { ClientFile } from '../../../entities/File';
import { ClientTag } from '../../../entities/Tag';
import IconSet from 'components/Icons';
import { Button, ButtonGroup, Tooltip, Menu, MenuDivider, MenuItem, SubMenu } from 'components';
import ImageInfo from '../../components/ImageInfo';
import StoreContext, { withRootstore, IRootStoreProp } from '../../contexts/StoreContext';
import { DnDType, DnDAttribute } from '../Outliner/TagsPanel/DnD';
import { getClassForBackground } from '../../utils';
import { ensureThumbnail } from '../../ThumbnailGeneration';
import { RendererMessenger } from 'src/Messaging';
import UiStore from '../../stores/UiStore';
import { SortMenuItems, LayoutMenuItems } from '../Toolbar/ContentToolbar';

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
              styling="outlined"
              onClick={() => {
                uiStore.selectFile(file, true);
                uiStore.openToolbarFileRemover();
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
  showContextMenu: React.Dispatch<{
    x: number;
    y: number;
    menu: JSX.Element | null;
  }>;
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
  ({
    file,
    isSelected,
    onClick,
    onDoubleClick,
    showDetails,
    showContextMenu,
  }: IGalleryItemProps) => {
    const { uiStore, fileStore } = useContext(StoreContext);

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

    const handleContextMenu = useCallback(
      (e: React.MouseEvent) => {
        showContextMenu({
          x: e.clientX,
          y: e.clientY,
          menu: <GalleryItemContextMenu file={file} />,
        });
      },
      [file, showContextMenu],
    );

    return (
      <div
        className="thumbnail"
        aria-selected={isSelected}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onContextMenu={handleContextMenu}
      >
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
            <Tooltip content="This image could not be found.">
              <span
                className="thumbnail-broken-overlay"
                onClick={(e) => {
                  e.stopPropagation(); // prevent image click event
                  fileStore.fetchMissingFiles();
                  uiStore.selectFile(file, true);
                }}
              >
                {IconSet.WARNING_BROKEN_LINK}
              </span>
            </Tooltip>
          )}
        </div>
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

export const GalleryContextMenuItems = () => {
  const { uiStore, fileStore } = useContext(StoreContext);
  return (
    <>
      <SubMenu icon={IconSet.VIEW_GRID} text="View method...">
        <LayoutMenuItems uiStore={uiStore} />
      </SubMenu>
      <SubMenu icon={IconSet.FILTER_NAME_DOWN} text="Sort by...">
        <SortMenuItems fileStore={fileStore} />
      </SubMenu>
    </>
  );
};

const GalleryItemContextMenu = ({ file }: { file: ClientFile }) => {
  const { uiStore, fileStore } = useContext(StoreContext);
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
        <MenuItem onClick={uiStore.openToolbarFileRemover} text="Delete" icon={IconSet.DELETE} />
        <MenuDivider />
        <GalleryContextMenuItems />
      </Menu>
    );
  }

  return (
    <Menu>
      <MenuItem onClick={handleViewFullSize} text="View at Full Size" icon={IconSet.SEARCH} />
      <MenuItem
        onClick={handlePreviewWindow}
        text="Open In Preview Window"
        icon={IconSet.PREVIEW}
      />
      <MenuItem onClick={handleInspect} text="Inspect" icon={IconSet.INFO} />

      <MenuDivider />
      <GalleryContextMenuItems />
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
  return showSimple ? <SimpleGalleryItem {...props} /> : <GalleryItem {...props} />;
};

export default observer(withRootstore(DelayedGalleryItem));
