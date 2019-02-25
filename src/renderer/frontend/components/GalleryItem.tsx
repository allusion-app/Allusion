import React from 'react';

import { observer } from 'mobx-react-lite';
import { DropTarget, ConnectDropTarget, DropTargetMonitor } from 'react-dnd';

import { ClientFile } from '../../entities/File';
import { Tag, Icon } from '@blueprintjs/core';
import { ClientTag } from '../../entities/Tag';

interface IGalleryItemTagProps {
  name: string;
  onRemove: () => void;
}
const GalleryItemTag = ({
  name,
  onRemove,
}: IGalleryItemTagProps) => (
  <Tag
    onRemove={onRemove}
    interactive
    intent="primary"
  >
    {name}
  </Tag>
);


interface IGalleryItemProps {
  file: ClientFile;
  isSelected: boolean;
  isOpen: boolean;
  selectionMode: boolean;
  onRemoveTag: (tag: ClientTag) => void;
  onSelect: (file: ClientFile, e: React.MouseEvent) => void;
  onOpen: (file: ClientFile) => void;
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
  isOpen,
  selectionMode,
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

  const className = `thumbnail ${selectedStyle} ${isOver ? dropStyle : ''} ${isOpen ? 'open' : ''}`;

  // Switch between opening/selecting depending on whether the selection mode is enabled
  const clickFunc = selectionMode ? (isSelected ? onDeselect : onSelect) : onOpen;

  return connectDropTarget(
    <div
      className={className}
    >
      <img
        key={`file-${file.id}`}
        src={file.path}
        onClick={(e) => clickFunc(file, e)}
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
        onClick={(e) => isSelected ? onDeselect(file, e) : onSelect(file, e)}
      >
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
export default DropTarget<IGalleryItemProps, IGalleryItemCollectedProps>(
  'tag',
  galleryItemTarget,
  (connect, monitor) => ({
    connectDropTarget: connect.dropTarget(),
    isOver: monitor.isOver(),
    canDrop: monitor.canDrop(),
  }),
)(observer(GalleryItem));
