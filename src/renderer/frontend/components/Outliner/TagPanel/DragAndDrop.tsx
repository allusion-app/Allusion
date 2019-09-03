import { observer } from 'mobx-react-lite';
import React, { useContext } from 'react';
import { useDragLayer } from 'react-dnd';
import { Tag } from '@blueprintjs/core';
import StoreContext from '../../../contexts/StoreContext';

import { ClientTagCollection, ROOT_TAG_COLLECTION_ID } from '../../../../entities/TagCollection';
import { ClientTag } from '../../../../entities/Tag';
import { formatTagCountText } from '../../../utils';

export const enum DragAndDropType {
  Collection = 'collection',
  Tag = 'tag',
}

const layerStyles: React.CSSProperties = {
  position: 'fixed',
  pointerEvents: 'none',
  zIndex: 100,
  left: 0,
  top: 0,
  width: '100%',
  height: '100%',
};

/** Layer on top of application which allows for custom drag previews */
// https://react-dnd.github.io/react-dnd/docs/api/drag-layer
export const DragLayer = observer(() => {
  const { uiStore, tagStore, tagCollectionStore } = useContext(StoreContext);
  const { item, itemType, currentOffset, isDragging } = useDragLayer((monitor) => ({
    item: monitor.getItem(),
    itemType: monitor.getItemType(),
    currentOffset: monitor.getClientOffset(),
    isDragging: monitor.isDragging(),
  }));

  if (
    !isDragging ||
    !currentOffset ||
    !(itemType === DragAndDropType.Collection || itemType === DragAndDropType.Tag)
  ) {
    return null;
  }

  const getItemStyles = () => {
    const { x, y } = currentOffset;
    const transform = `translate(${x}px, ${y}px)`;
    return { transform, WebkitTransform: transform };
  };

  const renderItem = () => {
    // Find out which items are in the context, based on what is selected
    const ctx = uiStore.getTagContextItems(item.id);

    switch (itemType) {
      case DragAndDropType.Collection: {
        const draggedCol = tagCollectionStore.getTagCollection(item.id) as ClientTagCollection;
        // If the dragged parent is selected, the whole parent is essentially being dragged, so no -1
        const numCollection =
          draggedCol.parent.id !== ROOT_TAG_COLLECTION_ID && draggedCol.parent.isSelected
            ? ctx.collections.length
            : ctx.collections.length - 1;
        const formattedText = formatTagCountText(ctx.tags.length, numCollection);

        const extraText = draggedCol.isSelected && formattedText && ` (${formattedText})`;
        return (
          <Tag intent="primary" large>
            {item.name}
            {extraText}
          </Tag>
        );
      }
      case DragAndDropType.Tag: {
        const draggedTag = tagStore.getTag(item.id) as ClientTag;
        // If the dragged parent is selected, the whole parent is essentially being dragged, so no -1
        const numTag =
          draggedTag.parent.id !== ROOT_TAG_COLLECTION_ID && draggedTag.parent.isSelected
            ? ctx.tags.length
            : ctx.tags.length - 1;
        const formattedText = formatTagCountText(numTag, ctx.collections.length);

        const extraText = draggedTag.isSelected && formattedText && ` (${formattedText})`;
        return (
          <Tag intent="primary" large>
            {item.name}
            {extraText}
          </Tag>
        );
      }
      default:
        return null;
    }
  };

  return (
    <div style={layerStyles}>
      <div style={getItemStyles()}>{renderItem()}</div>
    </div>
  );
});
