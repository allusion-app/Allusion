import React from 'react';

import { shell } from 'electron';

import { observer } from 'mobx-react-lite';
import { DropTarget, ConnectDropTarget, DropTargetMonitor } from 'react-dnd';

import { ClientFile } from '../../entities/File';
import { Tag, Icon, ContextMenuTarget, Menu, MenuItem } from '@blueprintjs/core';
import { ClientTag } from '../../entities/Tag';

interface IGalleryItemTagProps {
  name: string;
  onRemove: () => void;
}

const GalleryItemTag = ({ name, onRemove }: IGalleryItemTagProps) => (
  <Tag onRemove={onRemove} interactive intent="primary">
    {name}
  </Tag>
);

interface IGalleryItemProps {
  file: ClientFile;
  isSelected: boolean;
  onRemoveTag: (tag: ClientTag) => void;
  onSelect: (file: ClientFile) => void;
  onOpen: (file: ClientFile) => void;
  onDeselect: (file: ClientFile) => void;
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
  onRemoveTag,
  onSelect,
  onOpen,
  onDeselect,
  canDrop,
  isOver,
  connectDropTarget,
}: IGalleryItemProps & IGalleryItemCollectedProps) => {
  const selectedStyle = isSelected ? 'selected' : '';
  const dropStyle = canDrop ? ' droppable' : ' undroppable';

  const className = `thumbnail ${selectedStyle} ${isOver ? dropStyle : ''}`;

  return connectDropTarget(
    <div className={className}>
      <img
        key={`file-${file.id}`}
        src={file.path}
        onClick={() => onOpen(file)}
      />
      <span className="thumbnailTags">
        {file.clientTags.map((tag) => (
          <GalleryItemTag
            key={`gal-tag-${tag.id}`}
            name={tag.name}
            onRemove={() => onRemoveTag(tag)}
          />
        ))}
      </span>
      <div
        className={`thumbnailSelector ${isSelected ? 'selected' : ''}`}
        onClick={() => (isSelected ? onDeselect(file) : onSelect(file))}>
        <Icon icon={isSelected ? 'selection' : 'circle'} />
      </div>
    </div>,
  );
};

const galleryItemTarget = {
  drop(props: IGalleryItemProps, monitor: DropTargetMonitor) {
    props.onDrop(monitor.getItem());
  },
};

/** Make gallery item available to drop a tag onto */
const DroppableGalleryItem = DropTarget<IGalleryItemProps, IGalleryItemCollectedProps>(
  'tag',
  galleryItemTarget,
  (connect, monitor) => ({
    connectDropTarget: connect.dropTarget(),
    isOver: monitor.isOver(),
    canDrop: monitor.canDrop(),
  }),
)(observer(GalleryItem));

/** Wrapper that adds a context menu (with right click) */
@ContextMenuTarget
class TagListItemWithContextMenu extends React.PureComponent<
  IGalleryItemProps,
  { isContextMenuOpen: boolean }
> {
  state = {
    isContextMenuOpen: false,
  };
  render() {
    return (
      // Context menu doesn't appear for some reason without wrapping it with a div
      <span className={this.state.isContextMenuOpen ? 'contextMenuTarget' : ''}>
        <DroppableGalleryItem {...this.props} />
      </span>
    );
  }
  renderContextMenu() {
    this.setState({ isContextMenuOpen: true });
    return (
      <Menu>
          <MenuItem onClick={this.handleOpen} text="Open" />
          <MenuItem onClick={this.handleOpenWith} text="Open with" />
          <MenuItem onClick={this.handleOpenFileExplorer} text="Reveal in File Browser" />
          <MenuItem onClick={this.handleInspect} text="Inspect" />
      </Menu>
    );
  }
  handleOpen = () => { shell.openItem(this.props.file.path); };
  // Doesn't seem like "open with" is possible in electron :(
  // https://github.com/electron/electron/issues/4815
  handleOpenWith = () => { shell.openExternal(this.props.file.path); };
  handleOpenFileExplorer = () => { shell.showItemInFolder(this.props.file.path); };
  handleInspect = () => { console.log('Inspect'); shell.beep(); };
}

export default TagListItemWithContextMenu;
