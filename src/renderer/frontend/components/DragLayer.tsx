/** Layer on top of application which allows for custom drag previews */
// https://react-dnd.github.io/react-dnd/docs/api/drag-layer

import React from 'react';
import { DragLayer, DragLayerMonitor } from 'react-dnd';
import { TAG_DRAG_TYPE } from './TagListItem';
import { Tag } from '@blueprintjs/core';
import { COLLECTION_DRAG_TYPE } from './TagCollectionListItem';

const layerStyles: any = {
  position: 'fixed',
  pointerEvents: 'none',
  zIndex: 100,
  left: 0,
  top: 0,
  width: '100%',
  height: '100%',
};

function getItemStyles(currentOffset: { x: number, y: number }) {
  if (!currentOffset) {
    return {
      display: 'none',
    };
  }

  const { x, y } = currentOffset;
  const transform = `translate(${x}px, ${y}px)`;
  return {
    transform,
    WebkitTransform: transform,
  };
}

function renderItem(type: string, item: any) {
  // Todo: check if there are multiple items
  switch (type) {
    case TAG_DRAG_TYPE:
      return <Tag intent="primary" large>Custom Drag Preview!! {item.name}</Tag>;
    case COLLECTION_DRAG_TYPE:
      return <Tag intent="primary" large>Custom Drag Preview!! {item.name} (100 items)</Tag>;

  }
}

function CustomDragLayer({ item, itemType, isDragging, currentOffset }: any) {
  if (!isDragging) {
    return null;
  }

  return (
    <div style={layerStyles}>
      <div style={getItemStyles(currentOffset)}>{renderItem(itemType, item)}</div>
    </div>
  );
}

function collect(monitor: DragLayerMonitor) {
  return {
    item: monitor.getItem(),
    itemType: monitor.getItemType(),
    currentOffset: monitor.getSourceClientOffset(),
    isDragging: monitor.isDragging(),
  };
}

export default DragLayer(collect)(CustomDragLayer);
