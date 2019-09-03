import React, { useState, useEffect, useCallback } from 'react';
import { shell } from 'electron';
import { observer } from 'mobx-react-lite';
import { useDrop } from 'react-dnd';
import { Tag, ContextMenuTarget, Menu, MenuItem, H4, Classes, H3 } from '@blueprintjs/core';

import { ClientFile } from '../../entities/File';
import { ClientTag } from '../../entities/Tag';
import IconSet from './Icons';
import { SingleFileInfo } from './FileInfo';
import { withRootstore, IRootStoreProp } from '../contexts/StoreContext';
import { DragAndDropType } from './Outliner/TagPanel';

interface IGalleryItemTagProps {
  tag: ClientTag;
  onRemove: (tag: ClientTag) => void;
}

const GalleryItemTag = ({ tag, onRemove }: IGalleryItemTagProps) => {
  const handleRemove = useCallback(() => onRemove(tag), []);
  return (
    <Tag onRemove={handleRemove} interactive intent="primary">
      {tag.name}
    </Tag>
  );
};

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

  const handleRemoveTag = useCallback((tag: ClientTag) => file.removeTag(tag.id), []);
  const handleClickImg = useCallback((e) => onClick(file, e), []);

  const [imageElem] = useState<HTMLImageElement>(new Image());
  const [isImageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState();

  useEffect(() => {
    // Load the image manually when the component mounts
    imageElem.src = file.path;
    imageElem.onload = () => file && setImageLoaded(true);
    imageElem.onerror = (e) => file && setImageError(e);
    return () => {
      // When this component unmounts, cancel further loading of the image in case it was not loaded yet
      if (!isImageLoaded) {
        imageElem.src = '';
        imageElem.onload = () => { }; // tslint:disable-line: no-empty
        imageElem.onerror = () => { }; // tslint:disable-line: no-empty
      }
    };
  }, []);

  return (<div ref={galleryItemDrop} className={className}>
    <div onClick={handleClickImg} className="img-wrapper">
      {isImageLoaded ? <img src={file.path} /> // Show image when it has been loaded
        : imageError ? <H3>:( <br /> Could not load image</H3> // Show an error it it could not be loaded
          : <div className={Classes.SKELETON} /> // Else show a placeholder
      }
    </div>

    {showName && <H4>{file.name}</H4>}

    {showInfo && <SingleFileInfo file={file} />}

    {showTags && (
      <span className="thumbnailTags">
        {file.clientTags.map((tag) => (
          <GalleryItemTag
            key={`gal-tag-${file.id}-${tag.id}`}
            onRemove={handleRemoveTag}
            tag={tag}
          />
        ))}
      </span>
    )}
  </div>);
});

const GalleryItemContextMenu = ({ file, rootStore }: { file: ClientFile } & IRootStoreProp) => {
  const { uiStore } = rootStore;
  const handleOpen = useCallback(() => shell.openItem(file.path), []);
  const handleOpenFileExplorer = useCallback(() => shell.showItemInFolder(file.path), []);
  const handleInspect = useCallback(() => {
    uiStore.clearFileSelection();
    uiStore.selectFile(file);
    if (!uiStore.isInspectorOpen) {
      uiStore.toggleInspector();
    }
  }, []);

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
{ isContextMenuOpen: boolean }
> {
  state = {
    isContextMenuOpen: false,
    _isMounted: false,
  };

  constructor(props: IGalleryItemProps) {
    super(props);
  }

  componentDidMount() {
    this.state._isMounted = true;
  }

  componentWillUnmount() {
    this.state._isMounted = false;
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
    const { file, rootStore: { uiStore } } = this.props;
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
