import React, { useState, useEffect, useCallback, useMemo, useContext } from 'react';
import { shell, ipcRenderer } from 'electron';
import { observer } from 'mobx-react-lite';
import { useDrop } from 'react-dnd';
import { Tag, ContextMenuTarget, Menu, MenuItem, H4, Classes } from '@blueprintjs/core';
import urlLib from 'url';
import fse from 'fs-extra';

import { ClientFile } from '../../../entities/File';
import { ClientTag } from '../../../entities/Tag';
import IconSet from '../../components/Icons';
import ImageInfo from '../../components/ImageInfo';
import StoreContext, { withRootstore, IRootStoreProp } from '../../contexts/StoreContext';
import { DragAndDropType } from '../Outliner/TagPanel';
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
  onDrop: (item: any, file: ClientFile) => void;
  showDetails?: boolean;
}

const GalleryItem = observer(
  ({ file, isSelected, onClick, onDoubleClick, onDrop, showDetails }: IGalleryItemProps) => {
    const { uiStore } = useContext(StoreContext);

    const [{ isOver, canDrop }, galleryItemDrop] = useDrop({
      accept: DragAndDropType.Tag,
      drop: (_, monitor) => onDrop(monitor.getItem(), file),
      canDrop: () => true,
      collect: (monitor) => ({
        isOver: monitor.isOver(),
        canDrop: monitor.canDrop(),
      }),
    });

    const selectedStyle = isSelected ? 'selected' : '';
    const dropStyle = canDrop ? ' droppable' : ' undroppable';
    const className = `thumbnail ${selectedStyle} ${isOver ? dropStyle : ''}`;

    const handleClickImg = useCallback((e) => onClick(file, e), [file, onClick]);
    const handleDoubleClickImg = useCallback((e) => onDoubleClick && onDoubleClick(file, e), [
      file,
      onDoubleClick,
    ]);

    const [isImageLoaded, setImageLoaded] = useState(false);
    const [imageError, setImageError] = useState();

    const imagePath = uiStore.view.isSlideMode ? file.path : file.thumbnailPath;

    useEffect(() => {
      // First check whether a thumbnail exists, generate it if needed
      ensureThumbnail(file, uiStore.thumbnailDirectory);
    }, [file, uiStore.thumbnailDirectory]);

    useEffect(() => {
      if (imagePath) {
        setImageLoaded(true);
      } else {
        setImageLoaded(false);
      }
    }, [imagePath]);

    const handleImageError = useCallback(
      (err: any) => {
        console.log('Could not load image:', imagePath, err);
        setImageError(err);
        setImageLoaded(false);
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
        const selectedImgsAsHtml = uiStore.clientFileSelection.map((f) => `<img src="${urlLib.pathToFileURL(f.path)}" />`).join('\n ');
        e.dataTransfer.setData('text/html', selectedImgsAsHtml);
        e.dataTransfer.setData('text/uri-list', uiStore.clientFileSelection.map((f) => urlLib.pathToFileURL(f.path)).join('\r\n'));

        e.preventDefault();
        ipcRenderer.send('ondragstart', uiStore.clientFileSelection.map((f) => f.path));

        // uiStore.clientFileSelection.forEach((f) => e.dataTransfer.items.add(new File([], f.path)))
      } else {
        // Add the full-res image to the drag event (instead of thumbnail)
        e.dataTransfer.setData('text/html', `<img src="${urlLib.pathToFileURL(file.path)}" />`);
        e.dataTransfer.setData('text/uri-list', urlLib.pathToFileURL(file.path).toString());

        e.preventDefault();
        ipcRenderer.send('ondragstart', file.path);

        const imgEl = new Image();
        imgEl.src = file.path;
        e.dataTransfer.setDragImage(imgEl, 0, 0);

        const buffer = fse.readFileSync(file.path);
        const fileItem = new File([buffer], file.name, { lastModified: new Date().getTime() });
        e.dataTransfer.items.add(fileItem);
      }

      // console.log(new File([], file.path));

      // console.log(e.dataTransfer.types.map(t => ({ [t]: e.dataTransfer.getData(t)})));
      // console.log(e.dataTransfer.files);

    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [file, isSelected, uiStore.fileSelection, uiStore.fileSelection.length]);

    // TODO: When a filename contains https://x/y/z.abc?323 etc., it can't be found
    // e.g. %2F should be %252F on filesystems. Something to do with decodeURI, but seems like only on the filename - not the whole path

    return (
      <div ref={galleryItemDrop} className={className}>
        <div onClick={handleClickImg} className="img-wrapper" onDoubleClick={handleDoubleClickImg}>
          {isImageLoaded ? (
            <img src={imagePath} onError={handleImageError} onDragStart={handleDragStart} /> // Show image when it has been loaded
          ) : imageError ? (
            <span className="image-error">
              <span className="bp3-icon custom-icon custom-icon-32">{IconSet.DB_ERROR}</span> <br />{' '}
              Could not load image
            </span> // Show an error it it could not be loaded
          ) : (
                <div className={Classes.SKELETON} />
              ) // Else show a placeholder
          }
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
  const handleOpen = useCallback(() => shell.openItem(file.path), [file.path]);
  const handleOpenFileExplorer = useCallback(() => shell.showItemInFolder(file.path), [file.path]);
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
        <GalleryItem {...this.props} onDrop={this.props.onDrop} />
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

export default observer(withRootstore(GalleryItemWithContextMenu));
