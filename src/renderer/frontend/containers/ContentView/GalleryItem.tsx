import React, { useState, useEffect, useCallback, useMemo, useContext } from 'react';
import { shell } from 'electron';
import { observer } from 'mobx-react-lite';
import { useDrop } from 'react-dnd';
import { Tag, ContextMenuTarget, Menu, MenuItem, H4, Classes } from '@blueprintjs/core';

import { ClientFile } from '../../../entities/File';
import { ClientTag } from '../../../entities/Tag';
import IconSet from '../../components/Icons';
import ImageInfo from '../../components/ImageInfo';
import StoreContext, { withRootstore, IRootStoreProp } from '../../contexts/StoreContext';
import { DragAndDropType } from '../Outliner/TagPanel';
import { getClassForBackground } from '../../utils';
import { ensureThumbnail } from '../../ThumbnailGeneration';

interface IGalleryItemTagProps {
  tag: ClientTag;
  onRemove: (tag: ClientTag) => void;
}

const GalleryItemTag = observer(({ tag }: IGalleryItemTagProps) => {
  const colClass = useMemo(
    () => tag.viewColor ? getClassForBackground(tag.viewColor) : 'color-white',
    [tag.viewColor],
  );
  return (
    <Tag intent="primary" style={{ backgroundColor: tag.viewColor }}>
      <span className={colClass}>{tag.name}</span>
    </Tag>
  );
});

interface IGalleryItemProps extends IRootStoreProp {
  file: ClientFile;
  isSelected: boolean;
  onClick: (file: ClientFile, e: React.MouseEvent) => void;
  onDrop: (item: any, file: ClientFile) => void;
  showName?: boolean;
  showTags?: boolean;
  showInfo?: boolean;
}

export const GalleryItem = observer(({
  file,
  isSelected,
  onClick,
  onDrop,
  showName, showTags, showInfo,
}: IGalleryItemProps) => {
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

  const handleRemoveTag = useCallback((tag: ClientTag) => file.removeTag(tag.id), [file]);
  const handleClickImg = useCallback((e) => onClick(file, e), [file, onClick]);

  const [isImageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState();

  const imagePath = uiStore.view.isSlide ? file.path : file.thumbnailPath;

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

  const handleImageError = useCallback((err: any) => {
    console.log('Could not load image:', imagePath, err);
    setImageError(err);
    setImageLoaded(false);
  }, [imagePath]);

  return (
    <div ref={galleryItemDrop} className={className}>
      <div onClick={handleClickImg} className="img-wrapper">
        {isImageLoaded ? <img src={imagePath} onError={handleImageError} /> // Show image when it has been loaded
          : imageError ? <span className="image-error"><span className="bp3-icon custom-icon custom-icon-32">{IconSet.DB_ERROR}</span> <br /> Could not load image</span> // Show an error it it could not be loaded
            : <div className={Classes.SKELETON} /> // Else show a placeholder
        }
      </div>

      {showName && <H4>{file.name}</H4>}

      {showInfo && <ImageInfo file={file} />}

      {showTags && (
        <span className="thumbnailTags" onClick={handleClickImg}>
          {file.clientTags.map((tag) => (
            <GalleryItemTag
              key={`gal-tag-${file.id}-${tag.id}`}
              onRemove={handleRemoveTag}
              tag={tag}
            />
          ))}
        </span>
      )}
    </div>
  );
});

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
      <MenuItem onClick={handleOpenFileExplorer} text="Reveal in File Browser" icon={IconSet.FOLDER_CLOSE} />
      <MenuItem onClick={handleInspect} text="Inspect" icon={IconSet.INFO} />
      <MenuItem onClick={uiStore.openToolbarFileRemover} text="Delete" icon={IconSet.DELETE} />
    </Menu>
  );
};

/** Wrapper that adds a context menu (with right click) */
@ContextMenuTarget
class GalleryItemWithContextMenu extends React.PureComponent<
  IGalleryItemProps,
  { isContextMenuOpen: boolean, _isMounted: boolean }
> {
  state = {
    isContextMenuOpen: false,
    _isMounted: false,
  };

  constructor(props: IGalleryItemProps) {
    super(props);
  }

  componentDidMount() {
    this.setState({...this.state, _isMounted: true});
  }

  componentWillUnmount() {
    this.setState({...this.state, _isMounted: false});
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
  }

  private updateState = (updatableProp: any) => {
    if (this.state._isMounted) {
      this.setState(updatableProp);
    }
  }
}

export default observer(withRootstore(GalleryItemWithContextMenu));
