import React from 'react';

import { observer } from 'mobx-react-lite';
import { DropTarget, ConnectDropTarget, DropTargetMonitor } from 'react-dnd';

import { ClientFile } from '../../entities/File';

interface IGalleryItemProps {
  file: ClientFile;
  isSelected: boolean;
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
  onSelect,
  onDeselect,
  canDrop,
  isOver,
  connectDropTarget,
}: IGalleryItemProps & IGalleryItemCollectedProps) => {
  return connectDropTarget(
    <div
      className={`thumbnail${isSelected ? ' selected' : ''}${isOver && canDrop ? ' droppable' : ''}`}
      onClick={() => isSelected ? onDeselect(file) : onSelect(file)}
    >
      <img
        key={`file-${file.id}`}
        src={file.path}
      />
      <span>{file.clientTags.map((tag) => tag.name).join(', ')}</span>
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
