/** Layer on top of application which allows for custom drag previews */
// https://react-dnd.github.io/react-dnd/docs/api/drag-layer

import React, { useContext } from 'react';
import { DragLayer, DragLayerMonitor, XYCoord } from 'react-dnd';
import { Tag } from '@blueprintjs/core';
import { observer } from 'mobx-react-lite';

import { TAG_DRAG_TYPE } from './TagListItem';
import { COLLECTION_DRAG_TYPE } from './TagCollectionListItem';
import StoreContext from '../contexts/StoreContext';
import RootStore from '../stores/RootStore';
import { ClientTagCollection, ROOT_TAG_COLLECTION_ID } from '../../entities/TagCollection';
import { ClientTag } from '../../entities/Tag';
import { formatTagCountText } from '../utils';

const layerStyles: any = {
  position: 'fixed',
  pointerEvents: 'none',
  zIndex: 100,
  left: 0,
  top: 0,
  width: '100%',
  height: '100%',
};

interface IDragLayerItem {
  item: any;
  itemType: any;
  currentOffset: XYCoord | null;
  isDragging: boolean;
}

function getItemStyles(currentOffset: XYCoord) {
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
  const { uiStore, tagStore, tagCollectionStore } = rootStore;

  // Find out which items are in the context, based on what is selected
  const ctx = uiStore.getTagContextItems(item.id);

  let isDraggingSelection = false;
  let numTagMod = 0;
  let numColMod = 0;

  if (type === TAG_DRAG_TYPE) {
    const draggedTag = tagStore.tagList.find((t) => t.id === item.id) as ClientTag;
    isDraggingSelection = draggedTag.isSelected;
    // If the dragged parent is selected, the whole parent is essentially being dragged, so no -1
    numTagMod -= (draggedTag.parent.id !== ROOT_TAG_COLLECTION_ID && draggedTag.parent.isSelected ? 0 : 1);
  } else if (type === COLLECTION_DRAG_TYPE) {
    const draggedCol = tagCollectionStore.tagCollectionList.find((c) => c.id === item.id) as ClientTagCollection;
    isDraggingSelection = draggedCol.isSelected;
    // If the dragged parent is selected, the whole parent is essentially being dragged, so no -1
    numColMod -= (draggedCol.parent.id !== ROOT_TAG_COLLECTION_ID && draggedCol.parent.isSelected ? 0 : 1);
  } else {
    return null;
  }
  const formattedText = formatTagCountText(ctx.tags.length + numTagMod, ctx.collections.length + numColMod);

  const extraText = isDraggingSelection && (formattedText) && ` (${formattedText})`;
  return <Tag intent="primary" large>{item.name}{extraText}</Tag>;
}

function CustomDragLayer({ item, itemType, isDragging, currentOffset }: IDragLayerItem) {
  const rootStore = useContext(StoreContext);

  if (!isDragging || currentOffset === null ||
    !(itemType === TAG_DRAG_TYPE || itemType === COLLECTION_DRAG_TYPE)) {
    return null;
  }

  return (
    <div style={layerStyles}>
      <div style={getItemStyles(currentOffset)}>{renderItem(itemType, item, rootStore)}</div>
    </div>
  );
}

function collect(monitor: DragLayerMonitor): IDragLayerItem {
  return {
    item: monitor.getItem(),
    itemType: monitor.getItemType(),
    currentOffset: monitor.getClientOffset(),
    isDragging: monitor.isDragging(),
  };
}

export default DragLayer(collect)(observer(CustomDragLayer));
