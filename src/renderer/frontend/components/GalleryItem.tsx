import React, { useCallback } from 'react';

import { shell } from 'electron';

import { Tag, ContextMenuTarget, Menu, MenuItem } from '@blueprintjs/core';
import { observer } from 'mobx-react-lite';
import { DropTarget, ConnectDropTarget, DropTargetMonitor } from 'react-dnd';

import { ClientFile } from '../../entities/File';
import { ClientTag } from '../../entities/Tag';

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

interface IGalleryItemProps {
  file: ClientFile;
  isSelected: boolean;
  onClick: (file: ClientFile, e: React.MouseEvent) => void;
}

interface IDroppableProps {
  onDrop: (item: any) => void;
}

interface IGalleryItemCollectedProps {
  canDrop: boolean;
  isOver: boolean;
  connectDropTarget: ConnectDropTarget;
}

const GalleryItem = ({
  file,
  isSelected,
  onClick,
  canDrop,
  isOver,
  connectDropTarget,
}: IGalleryItemProps & IGalleryItemCollectedProps) => {
  const selectedStyle = isSelected ? 'selected' : '';
  const dropStyle = canDrop ? ' droppable' : ' undroppable';

  const className = `thumbnail ${selectedStyle} ${isOver ? dropStyle : ''}`;

  const handleRemoveTag = useCallback((tag: ClientTag) => file.removeTag(tag.id), []);
  const handleClickImg = useCallback((e) => onClick(file, e), []);

  return connectDropTarget(
    <div className={className}>
      <img
        key={`file-${file.id}`}
        src={file.path}
        onClick={handleClickImg}
      />
      <span className="thumbnailTags">
        {file.clientTags.map((tag) => (
          <GalleryItemTag
            key={`gal-tag-${file.id}-${tag.id}`}
            tag={tag}
            onRemove={handleRemoveTag}
          />
        ))}
      </span>
    </div>,
  );
};

const galleryItemTarget = {
  drop(props: IDroppableProps, monitor: DropTargetMonitor) {
    props.onDrop(monitor.getItem());
  },
};

/** Make gallery item available to drop a tag onto */
const DroppableGalleryItem = DropTarget<
  IGalleryItemProps & IDroppableProps,
  IGalleryItemCollectedProps
>('tag', galleryItemTarget, (connect, monitor) => ({
  connectDropTarget: connect.dropTarget(),
  isOver: monitor.isOver(),
  canDrop: monitor.canDrop(),
}))(observer(GalleryItem));

const GalleryItemContextMenu = (filePath: string) => {
  const handleOpen = () => {
    shell.openItem(filePath);
  };

  const handleOpenFileExplorer = () => {
    shell.showItemInFolder(filePath);
  };

  const handleInspect = () => {
    // Todo: Inspect
    console.log('Inspect');
  };

  return (
    <Menu>
      <MenuItem onClick={handleOpen} text="Open" />
      <MenuItem
        onClick={handleOpenFileExplorer}
        text="Reveal in File Browser"
      />
      <MenuItem onClick={handleInspect} text="Inspect" />
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

  handleDrop = (tag: ClientTag) => {
    this.props.file.addTag(tag.id);
  }

  render() {
    return (
      // Context menu/root element must supports the "contextmenu" event and the onContextMenu prop
      <span className={this.state.isContextMenuOpen ? 'contextMenuTarget' : ''}>
        <DroppableGalleryItem onDrop={this.handleDrop} {...this.props} />
      </span>
    );
  }

  renderContextMenu() {
    this.updateState({ isContextMenuOpen: true });
    return GalleryItemContextMenu(this.props.file.path);
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

export default GalleryItemWithContextMenu;
