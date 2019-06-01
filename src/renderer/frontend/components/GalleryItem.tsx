import React, { useState, useEffect, useCallback } from 'react';
import { shell } from 'electron';
import { observer } from 'mobx-react-lite';
import { DropTarget, ConnectDropTarget, DropTargetMonitor } from 'react-dnd';
import { Tag, ContextMenuTarget, Menu, MenuItem, H4, Classes, H3 } from '@blueprintjs/core';

import { ClientFile } from '../../entities/File';
import { ClientTag } from '../../entities/Tag';
import IconSet from './Icons';
import { SingleFileInfo } from './FileInfo';
import { withRootstore, IRootStoreProp } from '../contexts/StoreContext';

interface IGalleryItemTagProps {
  name: string;
  onRemove: () => void;
}

const GalleryItemTag = ({ name, onRemove }: IGalleryItemTagProps) => (
  <Tag onRemove={onRemove} interactive intent="primary">
    {name}
  </Tag>
);

interface IGalleryItemProps extends IRootStoreProp {
  file: ClientFile;
  isSelected: boolean;
  onRemoveTag: (tag: ClientTag) => void;
  onSelect: (file: ClientFile, e: React.MouseEvent) => void;
  onDeselect: (file: ClientFile, e: React.MouseEvent) => void;
  onDrop: (item: any) => void;
  showName?: boolean;
  showTags?: boolean;
  showInfo?: boolean;
}

interface IGalleryItemCollectedProps {
  canDrop: boolean;
  isOver: boolean;
  connectDropTarget: ConnectDropTarget;
}

export const GalleryItem = ({
  file,
  isSelected,
  onRemoveTag,
  onSelect,
  onDeselect,
  canDrop,
  isOver,
  connectDropTarget,
  showName, showTags, showInfo,
}: IGalleryItemProps & IGalleryItemCollectedProps) => {
  const selectedStyle = isSelected ? 'selected' : '';
  const dropStyle = canDrop ? ' droppable' : ' undroppable';
  const className = `thumbnail ${selectedStyle} ${isOver ? dropStyle : ''}`;

  // Switch between opening/selecting depending on whether the selection mode is enabled
  const clickFunc = useCallback(
    (e: React.MouseEvent) => isSelected ? onDeselect(file, e) : onSelect(file, e),
    [isSelected, file],
  );

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
        imageElem.onload = () => {}; // tslint:disable-line: no-empty
        imageElem.onerror = () => {}; // tslint:disable-line: no-empty
      }
    };
  }, []);

  return connectDropTarget(
    <div className={className}>
      <div onClick={clickFunc} className="img-wrapper">
        {isImageLoaded ? <img src={file.path} /> // Show image when it has been loaded
          : imageError ? <H3>:( <br /> Could not load image</H3> // Show an error it it could not be loaded
            : <div className={Classes.SKELETON} /> // Else show a placeholder
        }
      </div>

      { showName && <H4>{file.name}</H4>}

      {showInfo && <SingleFileInfo file={file} />}

      { showTags && (
        <span className="thumbnailTags">
          {file.clientTags.map((tag) => (
            <GalleryItemTag
              key={`gal-tag-${file.id}-${tag.id}`}
              name={tag.name}
              onRemove={() => onRemoveTag(tag)}
            />
          ))}
        </span>
      )}
    </div>,
  );
};

const galleryItemTarget = {
  drop(props: IGalleryItemProps, monitor: DropTargetMonitor) {
    props.onDrop(monitor.getItem());
  },
};

/** Make gallery item available to drop a tag onto */
const DroppableGalleryItem = DropTarget<
  IGalleryItemProps,
  IGalleryItemCollectedProps
>('tag', galleryItemTarget, (connect, monitor) => ({
  connectDropTarget: connect.dropTarget(),
  isOver: monitor.isOver(),
  canDrop: monitor.canDrop(),
}))(observer(GalleryItem));

const GalleryItemContextMenu = ({ filePath, rootStore }: { filePath: string } & IRootStoreProp) => {
  const { uiStore } = rootStore;

  const handleOpen = useCallback(() => shell.openItem(filePath), []);

  const handleOpenFileExplorer = useCallback(() => shell.showItemInFolder(filePath), []);

  return (
    <Menu>
      <MenuItem onClick={handleOpen} text="Open External" icon={IconSet.OPEN_EXTERNAL} />
      <MenuItem onClick={handleOpenFileExplorer} text="Reveal in File Browser" icon={IconSet.FOLDER_CLOSE} />
      {/* <MenuItem onClick={handleInspect} text="Inspect" icon={IconSet.INFO} /> */}
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
        <DroppableGalleryItem {...this.props} />
      </span>
    );
  }

  renderContextMenu() {
    this.updateState({ isContextMenuOpen: true });
    return <GalleryItemContextMenu filePath={this.props.file.path} rootStore={this.props.rootStore} />;
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
