import React, { useState, useEffect, useCallback, useMemo, useContext } from 'react';
import { shell, ipcRenderer } from 'electron';
import { observer } from 'mobx-react-lite';
import { useDrop } from 'react-dnd';
import { Tag, ContextMenuTarget, Menu, MenuItem, H4, Classes } from '@blueprintjs/core';
import urlLib from 'url';
import fse from 'fs-extra';

import { ClientFile } from '../../../entities/File';
import { ClientTag } from '../../../entities/Tag';
import IconSet from 'components/Icons';
import ImageInfo from '../../components/ImageInfo';
import StoreContext, { withRootstore, IRootStoreProp } from '../../contexts/StoreContext';
import { DnDType, DnDAttribute } from '../Outliner/TagsPanel/DnD';
import { getClassForBackground } from '../../utils';
import { ensureThumbnail } from '../../ThumbnailGeneration';

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
  <span className="thumbnailTags" onClick={onClick} onDoubleClick={onDoubleClick}>
    {tags.map((tag) => (
      <ThumbnailTag key={tag.id} name={tag.name} color={tag.viewColor} />
    ))}
  </span>
));

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
          setThumbnailGenerating(true);
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

    const handleDragStart = useCallback(async (e: React.DragEvent<HTMLImageElement>) => {
      if (!e.dataTransfer) return;
      // Set a flag so that we can ignore the drag event in the DragOverlay
      e.dataTransfer.setData('text/allusion-ignore', '');
      (window as any).internalDragStart = new Date();

      // If file is selected, add all selected items to the drag event
      if (isSelected && uiStore.fileSelection.length > 1) {
        const selectedImgsAsHtml = uiStore.clientFileSelection.map((f) => `<img src="${urlLib.pathToFileURL(f.absolutePath)}" />`).join('\n ');
        e.dataTransfer.setData('text/html', selectedImgsAsHtml);
        e.dataTransfer.setData('text/uri-list', uiStore.clientFileSelection.map((f) => urlLib.pathToFileURL(f.absolutePath)).join('\r\n'));

        e.preventDefault();
        ipcRenderer.send('ondragstart', uiStore.clientFileSelection.map((f) => f.absolutePath));

        // uiStore.clientFileSelection.forEach((f) => e.dataTransfer.items.add(new File([], f.absolutePath)))
      } else {
        // Add the full-res image to the drag event (instead of thumbnail)
        e.dataTransfer.setData('text/html', `<img src="${urlLib.pathToFileURL(file.absolutePath)}" />`);
        e.dataTransfer.setData('text/uri-list', urlLib.pathToFileURL(file.absolutePath).toString());

        e.preventDefault();
        ipcRenderer.send('ondragstart', file.absolutePath);

        const imgEl = new Image();
        imgEl.src = file.absolutePath;
        e.dataTransfer.setDragImage(imgEl, 0, 0);

        const buffer = fse.readFileSync(file.absolutePath);
        const fileItem = new File([buffer], file.name, { lastModified: new Date().getTime() });
        e.dataTransfer.items.add(fileItem);
      }

      // console.log(new File([], file.absolutePath));

      // console.log(e.dataTransfer.types.map(t => ({ [t]: e.dataTransfer.getData(t)})));
      // console.log(e.dataTransfer.files);

    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [file, isSelected, uiStore.fileSelection, uiStore.fileSelection.length]);

    // TODO: When a filename contains https://x/y/z.abc?323 etc., it can't be found
    // e.g. %2F should be %252F on filesystems. Something to do with decodeURI, but seems like only on the filename - not the whole path

    return (
      <div
        className={`thumbnail ${isSelected ? 'selected' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div onClick={handleClickImg} className="img-wrapper" onDoubleClick={handleDoubleClickImg}>
          {isThumbnailReady ? (
            // Show image when it has been loaded
            <img src={imagePath} onError={handleImageError} className="bp3-skeleton" alt="" onDragStart={handleDragStart} />
          ) : isThumbnailGenerating ? (
            // If it's being generated, show a placeholder
            <div className="donut-loading" />
          ) : (
            // Show an error it it could not be loaded
            <span className="image-error">
              <span className="bp3-icon custom-icon custom-icon-128">{IconSet.DB_ERROR}</span>{' '}
              <br /> Could not load image
            </span>
          )}
        </div>
        {showDetails && (
          <>
            <H4>{file.name}</H4>
            <ImageInfo file={file} />
          </>
        )}
        <ThumbnailTags
          tags={file.clientTags}
          onClick={handleClickImg}
          onDoubleClick={handleDoubleClickImg}
        />
      </div>
    );
  },
);

const GalleryItemContextMenu = ({ file, rootStore }: { file: ClientFile } & IRootStoreProp) => {
  const { uiStore } = rootStore;
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

  return (
    <Menu>
      <MenuItem onClick={handleOpen} text="Open External" icon={IconSet.OPEN_EXTERNAL} />
      <MenuItem
        onClick={handleOpenFileExplorer}
        text="Reveal in File Browser"
        icon={IconSet.FOLDER_CLOSE}
      />
      <MenuItem onClick={handleInspect} text="Inspect" icon={IconSet.INFO} />
      {/* <MenuItem onClick={uiStore.openToolbarFileRemover} text="Delete" icon={IconSet.DELETE} /> */}
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
    const {
      file,
      rootStore: { uiStore },
    } = this.props;
    // If the selection does not contain this item, replace the selection with this item
    if (!uiStore.fileSelection.includes(file.id)) {
      this.props.rootStore.uiStore.selectFile(file, true);
    }

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
  // TODO: List gallery styling
  // useEffect(() => {
  //   // First check whether a thumbnail exists, generate it if needed
  //   ensureThumbnail(file, uiStore.thumbnailDirectory);
  // }, [file, uiStore.thumbnailDirectory]);

  return (
    <div className={`thumbnail ${isSelected ? 'selected' : ''}`}>
      <div className="img-wrapper">
        <img src={file.thumbnailPath} alt="" className="bp3-skeleton" />
      </div>
      {showDetails && (
        <>
          <H4>{file.name}</H4>
          <ImageInfo file={file} />
        </>
      )}
      <span className="thumbnailTags placeholder bp3-skeleton" />
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
