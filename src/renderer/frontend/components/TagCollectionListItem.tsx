import { ContextMenuTarget, Menu, MenuItem, Divider } from '@blueprintjs/core';
import React, { useState, useEffect } from 'react';
import { useDrag, useDrop } from 'react-dnd';

import { ClientTagCollection } from '../../entities/TagCollection';
import { ModifiableTagListItem, TAG_DRAG_TYPE, ITagDragItem } from './TagListItem';
import { getEmptyImage } from 'react-dnd-html5-backend';
import { ID } from '../../entities/ID';
import IconSet from './Icons';
import UiStore from '../stores/UiStore';
import StoreContext, { IRootStoreProp } from '../contexts/StoreContext';
import { formatTagCountText } from '../utils';

export const COLLECTION_DRAG_TYPE = 'collection';
export const DEFAULT_COLLECTION_NAME = 'New collection';

interface ITagCollectionListItemProps extends IRootStoreProp {
  tagCollection: ClientTagCollection;
  onRemove?: (tagCollection: ClientTagCollection) => void;
  onAddTag: () => void;
  onAddCollection: () => void;
  onExpand: () => void;
  onExpandAll: () => void;
  onCollapseAll: () => void;
  onMoveTag: (dropProps: ITagDragItem) => void;
  onMoveCollection: (dropProps: ITagDragItem) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  hoverTimeToExpand?: number;
  onAddSelectionToQuery: () => void;
  onReplaceQuery: () => void;
  onSelect: (colId: ID, clear?: boolean) => void;
}

const TagCollectionListItem = ({
  tagCollection,
  onExpand,
  onMoveTag,
  onMoveCollection,
  hoverTimeToExpand = 1000,
}: ITagCollectionListItemProps & { uiStore: UiStore }) => {
  const [{ isDragging }, connectDragSource, connectDragPreview] = useDrag({
    item: { type: COLLECTION_DRAG_TYPE },
    begin: () => ({
      type: COLLECTION_DRAG_TYPE,
      id: tagCollection.id,
      name: tagCollection.name,
      isSelected: tagCollection.isSelected,
    }),
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  // Drag & drop based on:
  // - https://react-dnd.github.io/react-dnd/examples/sortable/cancel-on-drop-outside
  // - https://gist.github.com/G710/6f85869b73ff08ce95ca93e31ed510f8
  const [{ isHovering, canDrop }, connectDropTarget] = useDrop({
    accept: [TAG_DRAG_TYPE, COLLECTION_DRAG_TYPE],
    drop: (_, monitor) => {
      const type = monitor.getItemType();
      if (type === COLLECTION_DRAG_TYPE) {
        onMoveCollection(monitor.getItem());
      } else if (type === TAG_DRAG_TYPE) {
        onMoveTag(monitor.getItem());
      }
    },
    canDrop: (_, monitor) => {
      const { id: draggedId, isSelected: draggedIsSelected }: ITagDragItem = monitor.getItem();
      const type = monitor.getItemType();
      if (type === COLLECTION_DRAG_TYPE) {
        if (!draggedIsSelected) {

          // Dragging a collection over another collection is allowed if it's not itself
          const { id: overId } = tagCollection;
          if (draggedId === overId) {
            return false;
          }
          // and it's not in its own children
          const draggedCollection = tagCollection.store.tagCollectionList.find((c) => c.id === draggedId);
          if (draggedCollection) {
            return !draggedCollection.containsSubCollection(tagCollection);
          }
        } else {
          // Else, only allowed when this collection is not selected (else you drop something on itself)
          return draggedIsSelected ? !tagCollection.isSelected : true;
        }
      } else if (type === TAG_DRAG_TYPE) {
        // Dragging a tag over a collection is always allowed if it's not selected
        // Else, only allowed when this collection is not selected (else you drop something on itself)
        return draggedIsSelected ? !tagCollection.isSelected : true;
      }
      return false;
    },
    collect: (monitor) => ({
      isHovering: monitor.isOver(),
      canDrop: monitor.canDrop(),
    }),
  });
  // Hide preview, since a custom preview is created in DragLayer
  useEffect(() => { connectDragPreview(getEmptyImage()); }, []);

  // When hovering over a collection for some time, automatically expand it
  const [expandTimeout, setExpandTimeout] = useState(0);
  useEffect(() => {
    if (!canDrop) {
      clearTimeout(expandTimeout);
      return;
    }
    // Clear timer if isHovering changes
    if (expandTimeout) {
      clearTimeout(expandTimeout);
    }
    // Set a timeout to expand after some time if starting to hover
    if (isHovering) {
      setExpandTimeout(window.setTimeout(onExpand, hoverTimeToExpand));
    }
  }, [isHovering]);

  // Style whether the element is being dragged or hovered over to drop on
  const className = `${
    canDrop && !isDragging && isHovering ? 'reorder-target' : ''} ${isDragging ? 'reorder-source' : ''}`;
  return connectDropTarget(
    connectDragSource(
      <div className={className}>
        {tagCollection.name}
        {tagCollection.isEmpty && <i style={{ color: '#007af5 !important' }}> (empty)</i>}
      </div>),
  );
};

//// Add context menu /////
interface ITagCollectionContextMenu {
  collection: ClientTagCollection;
  onNewTag: () => void;
  onNewCollection: () => void;
  enableEditing: () => void;
  onExpandAll: () => void;
  onCollapseAll: () => void;
  onRemove?: () => void;
  onAddSelectionToQuery: () => void;
  onReplaceQuery: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  numTagsToDelete: number;
  numColsToDelete: number;
}
const TagCollectionListItemContextMenu = ({
  collection, onNewTag, onNewCollection, enableEditing, onExpandAll, onCollapseAll, onRemove,
  onAddSelectionToQuery, onReplaceQuery, onMoveUp, onMoveDown, numTagsToDelete, numColsToDelete,
}: ITagCollectionContextMenu) => {
  let deleteText = formatTagCountText(numTagsToDelete, numColsToDelete);
  deleteText = deleteText && ` (${deleteText})`;
  return (
    <Menu>
      <MenuItem onClick={onNewTag} text="New tag" icon={IconSet.TAG_ADD} />
      <MenuItem onClick={onNewCollection} text="New collection" icon={IconSet.TAG_ADD_COLLECTION} />
      <MenuItem onClick={enableEditing} text="Rename" icon={IconSet.EDIT} />
      <MenuItem onClick={onRemove} text={`Delete${deleteText}`} icon={IconSet.DELETE} disabled={!onRemove} />
      <Divider />
      <MenuItem onClick={onExpandAll} text="Expand" icon={IconSet.ITEM_EXPAND} />
      <MenuItem onClick={onCollapseAll} text="Collapse" icon={IconSet.ITEM_COLLAPS} />
      <MenuItem onClick={onMoveUp} text="Move up" icon={IconSet.ITEM_MOVE_UP} />
      <MenuItem onClick={onMoveDown} text="Move down" icon={IconSet.ITEM_MOVE_DOWN} />
      <Divider />
      <MenuItem onClick={onAddSelectionToQuery} text="Add to search query" icon={IconSet.SEARCH} />
      <MenuItem onClick={onReplaceQuery} text="Replace search query" icon={IconSet.REPLACE} />
    </Menu>
  );
};

interface ITagCollectionListItemWithContextMenuState {
  isContextMenuOpen: boolean;
  isEditing: boolean;
  _isMounted: boolean;
}

/** Wrapper that adds a context menu (with right click) */
@ContextMenuTarget
class TagCollectionListItemWithContextMenu extends React.PureComponent<
ITagCollectionListItemProps,
ITagCollectionListItemWithContextMenuState
> {
  state = {
    isEditing: false,
    isContextMenuOpen: false,
    _isMounted: false,
  };

  componentDidMount() {
    this.state._isMounted = true;
    // Todo: Same as in TagListItem: hacky solution
    const { tagCollection: { name, dateAdded } } = this.props;
    if (name === DEFAULT_COLLECTION_NAME && (new Date().getTime() - dateAdded.getTime()) < 200) {
      this.setState({ isEditing: true });
    }
  }

  componentWillUnmount() {
    this.state._isMounted = false;
  }

  handleRename = (newName: string) => {
    this.props.tagCollection.name = newName;
    this.updateState({ isEditing: false });
  }

  handleRenameAbort = () => {
    this.updateState({ isEditing: false });
  }

  render() {
    const { tagCollection } = this.props;
    const { isEditing } = this.state;
    return (
      <div className={this.state.isContextMenuOpen ? 'contextMenuTarget' : ''} key={tagCollection.id}>
        <StoreContext.Consumer>

          {({ uiStore }) => (
            isEditing
              ? <ModifiableTagListItem
                initialName={tagCollection.name}
                onRename={this.handleRename}
                onAbort={this.handleRenameAbort}
              />
              : <TagCollectionListItem {...this.props} uiStore={uiStore} />
          )
          }
        </StoreContext.Consumer>
      </div>
    );
  }

  renderContextMenu() {
    this.updateState({ isContextMenuOpen: true });
    const ctx = this.props.rootStore.uiStore.getTagContextItems(this.props.tagCollection.id);
    return (
      <TagCollectionListItemContextMenu
        collection={this.props.tagCollection}
        onNewTag={this.props.onAddTag}
        onNewCollection={this.props.onAddCollection}
        enableEditing={() => this.setEditing(true)}
        onExpandAll={this.props.onExpandAll}
        onCollapseAll={this.props.onCollapseAll}
        onRemove={this.handleRemove}
        onAddSelectionToQuery={this.props.onAddSelectionToQuery}
        onReplaceQuery={this.props.onReplaceQuery}
        onMoveUp={this.props.onMoveUp}
        onMoveDown={this.props.onMoveDown}
        numColsToDelete={Math.max(0, ctx.collections.length - 1)}
        numTagsToDelete={ctx.tags.length}
      />
    );
  }

  handleRemove = () => {
    const { onRemove, tagCollection } = this.props;
    if (onRemove) {
      onRemove(tagCollection);
    }
  }

  onContextMenuClose = () => {
    this.updateState({ isContextMenuOpen: false });
  }

  setEditing = (val: boolean) => {
    this.updateState({ isEditing: val });
  }

  private updateState<K extends keyof ITagCollectionListItemWithContextMenuState>(
    updatableProp: Pick<ITagCollectionListItemWithContextMenuState, K>,
  ) {
    if (this.state._isMounted) {
      this.setState(updatableProp);
    }
  }
}

export default TagCollectionListItemWithContextMenu;
