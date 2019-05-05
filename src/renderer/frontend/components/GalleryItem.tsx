import React from 'react';

import { shell } from 'electron';

import { observer } from 'mobx-react-lite';
import { DropTarget, ConnectDropTarget, DropTargetMonitor } from 'react-dnd';

import { ClientFile } from '../../entities/File';
import {
  Tag,
  ContextMenuTarget,
  Menu,
  MenuItem,
} from '@blueprintjs/core';
import { ClientTag } from '../../entities/Tag';
import IconSet from './Icons';
import handleRemoveSelectedFiles from '../components/Toolbar';

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
  onSelect: (file: ClientFile, e: React.MouseEvent) => void;
  onDeselect: (file: ClientFile, e: React.MouseEvent) => void;
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
  onDeselect,
  canDrop,
  isOver,
  connectDropTarget,
}: IGalleryItemProps & IGalleryItemCollectedProps) => {
  const selectedStyle = isSelected ? 'selected' : '';
  const dropStyle = canDrop ? ' droppable' : ' undroppable';

  const className = `thumbnail ${selectedStyle} ${isOver ? dropStyle : ''}`;

  // Switch between opening/selecting depending on whether the selection mode is enabled
  const clickFunc = isSelected ? onDeselect : onSelect;

  return connectDropTarget(
    <div className={className}>
      <img
        key={`file-${file.id}`}
        src={file.path}
        onClick={(e) => clickFunc(file, e)}
      />
      <span className="thumbnailTags">
        {file.clientTags.map((tag) => (
          <GalleryItemTag
            key={`gal-tag-${file.id}-${tag.id}`}
            name={tag.name}
            onRemove={() => onRemoveTag(tag)}
          />
        ))}
      </span>
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

const GalleryItemContextMenu = (filePath: string) => {
  const handleOpen = () => {
    shell.openItem(filePath);
  };

  const handleOpenFileExplorer = () => {
    shell.showItemInFolder(filePath);
  };

  const handleInspect = () => {
    console.log('Inspect');
    shell.beep();
  };

  return (
    <Menu>
      <MenuItem onClick={handleOpen} text="Open External" icon={IconSet.OPEN_EXTERNAL} />
      <MenuItem onClick={handleOpenFileExplorer} text="Reveal in File Browser" icon={IconSet.FOLDER_CLOSE} />
      <MenuItem onClick={handleInspect} text="Inspect" icon={IconSet.INFO} />
      <MenuItem onClick={handleRemoveSelectedFiles} text="Delete" icon={IconSet.DELETE} />
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
