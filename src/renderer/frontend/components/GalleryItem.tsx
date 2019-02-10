import React from 'react';

import { observer } from 'mobx-react-lite';
import { DropTarget, ConnectDropTarget, DropTargetMonitor } from 'react-dnd';

import { ClientFile } from '../../entities/File';
import { Tag } from '@blueprintjs/core';
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
  onRemoveTag: (tag: ClientTag) => void;
  onSelect: (file: ClientFile) => void;
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
  onDeselect,
  canDrop,
  isOver,
  connectDropTarget,
}: IGalleryItemProps & IGalleryItemCollectedProps) => {

  const selectedStyle = isSelected ? 'selected' : '';
  const dropStyle = canDrop ? ' droppable' : ' undroppable';

  const className = `thumbnail ${selectedStyle} ${isOver ? dropStyle : ''}`;

  return connectDropTarget(
    <div
      className={className}
    >
      <img
        key={`file-${file.id}`}
        src={file.path}
        onClick={() => isSelected ? onDeselect(file) : onSelect(file)}
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
