/** Layer on top of application which allows for custom drag previews */
// https://react-dnd.github.io/react-dnd/docs/api/drag-layer

import React, { useContext } from 'react';
import { DragLayer, DragLayerMonitor } from 'react-dnd';
import { TAG_DRAG_TYPE } from './TagListItem';
import { Tag } from '@blueprintjs/core';
import { COLLECTION_DRAG_TYPE } from './TagCollectionListItem';
import StoreContext from '../contexts/StoreContext';
import RootStore from '../stores/RootStore';
import { observer } from 'mobx-react-lite';
import { ClientTagCollection } from '../../entities/TagCollection';

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

function renderItem(type: string, item: any, rootStore: RootStore) {
  const { uiStore, tagCollectionStore } = rootStore;

  if (type === TAG_DRAG_TYPE) {
    const isDraggingSelection = uiStore.tagSelection.includes(item.id);
    const extraText = isDraggingSelection && uiStore.tagSelection.length > 1
      ? ` (+${uiStore.tagSelection.length - 1})`
      : '';
    return <Tag intent="primary" large>{item.name}{extraText}</Tag>;
  } else if (type === COLLECTION_DRAG_TYPE) {
    const draggedCol = tagCollectionStore.tagCollectionList.find((c) => c.id === item.id) as ClientTagCollection;
    const tagsInCol = draggedCol.getTagsRecursively();
    const selectedTagsNotInCol = uiStore.tagSelection.filter((t) => !tagsInCol.includes(t));
    const extraText = selectedTagsNotInCol.length > 0 && ` (+${selectedTagsNotInCol.length})`;
    return <Tag intent="primary" large>{draggedCol.name}{extraText}</Tag>;
  }
}

function CustomDragLayer({ item, itemType, isDragging, currentOffset }: any) {
  const rootStore = useContext(StoreContext);
  if (!isDragging) {
    return null;
  }

  return (
    <div style={layerStyles}>
      <div style={getItemStyles(currentOffset)}>{renderItem(itemType, item, rootStore)}</div>
    </div>
  );
}

function collect(monitor: DragLayerMonitor) {
  return {
    item: monitor.getItem(),
    itemType: monitor.getItemType(),
    currentOffset: monitor.getClientOffset(),
    isDragging: monitor.isDragging(),
  };
}

export default DragLayer(collect)(observer(CustomDragLayer));
