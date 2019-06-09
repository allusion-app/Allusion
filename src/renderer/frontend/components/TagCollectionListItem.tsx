import { ClientTagCollection } from '../../entities/TagCollection';
import { ContextMenuTarget, Menu, MenuItem, Divider, Alert } from '@blueprintjs/core';
import { ModifiableTagListItem, TAG_DRAG_TYPE } from './TagListItem';
import React, { useState, useEffect, useCallback } from 'react';
import {
  DragSource, DragSourceConnector, DragSourceMonitor, ConnectDragSource,
  DropTarget, DropTargetConnector, DropTargetMonitor, ConnectDropTarget, DropTargetSpec, DragSourceSpec,
} from 'react-dnd';
import { ID } from '../../entities/ID';
import IconSet from './Icons';

export const COLLECTION_DRAG_TYPE = 'collection';
export const DEFAULT_COLLECTION_NAME = 'New collection';

interface ITagCollectionListItemProps {
  tagCollection: ClientTagCollection;
  onRemove?: (tagCollection: ClientTagCollection) => void;
  onAddTag: () => void;
  onAddCollection: () => void;
  onExpand: () => void;
  onExpandAll: () => void;
  onCollapseAll: () => void;
  onMoveTag: (movedTag: ID) => void;
  onMoveCollection: (movedCollection: ID) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  hoverTimeToExpand?: number;
  onAddSelectionToQuery: () => void;
  onReplaceQuery: () => void;
}

interface IDropProps {
  connectDropTarget: ConnectDropTarget;
  isHovering: boolean;
  canDrop: boolean;
}

interface IDragProps {
  connectDragSource: ConnectDragSource;
  isDragging: boolean;
}

const TagCollectionListItem = ({
  tagCollection,
  isDragging,
  isHovering,
  connectDropTarget,
  connectDragSource,
  onExpand,
  canDrop,
  hoverTimeToExpand = 1000,
}: ITagCollectionListItemProps & IDropProps & IDragProps) => {
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
        {tagCollection.tags.length === 0 && tagCollection.subCollections.length === 0 && <i> (empty)</i>}
      </div>),
  );
};

// Drag & drop based on:
// - https://react-dnd.github.io/react-dnd/examples/sortable/cancel-on-drop-outside
// - https://gist.github.com/G710/6f85869b73ff08ce95ca93e31ed510f8
///// Make it droppable ///////
const tagCollectionDropTarget: DropTargetSpec<ITagCollectionListItemProps> = {
  canDrop(props, monitor) {
    const { id: draggedId } = monitor.getItem();
    const type = monitor.getItemType();
    if (type === COLLECTION_DRAG_TYPE) {
      // Dragging a collection over another collection is allowed if it's not itself
      const { id: overId } = props.tagCollection;
      if (draggedId === overId) {
        return false;
      }
      // and it's not in its own children
      const draggedCollection = props.tagCollection.store.tagCollectionList.find((c) => c.id === draggedId);
      if (draggedCollection) {
        return !draggedCollection.containsSubCollection(props.tagCollection);
      }
    } else if (type === TAG_DRAG_TYPE) {
      // Dragging a tag over a collection is always allowed
      return true;
    }
    return false;
  },
  drop(props, monitor) {
    const type = monitor.getItemType();
    if (type === COLLECTION_DRAG_TYPE) {
      props.onMoveCollection(monitor.getItem().id);
    } else if (type === TAG_DRAG_TYPE) {
      props.onMoveTag(monitor.getItem().id);
    }
  },
};

function collectDropTarget(connect: DropTargetConnector, monitor: DropTargetMonitor): IDropProps {
  return {
    connectDropTarget: connect.dropTarget(),
    isHovering: monitor.isOver(),
    canDrop: monitor.canDrop(),
  };
}

///// Make it draggable ///////
const tagCollectionDragSource: DragSourceSpec<ITagCollectionListItemProps, any> = {
  beginDrag: (props: ITagCollectionListItemProps) => ({
    id: props.tagCollection.id,
  }),
};

function collectDragSource(connect: DragSourceConnector, monitor: DragSourceMonitor): IDragProps {
  return {
    connectDragSource: connect.dragSource(),
    isDragging: monitor.isDragging(),
  };
}

const DraggableTagCollectionListItem = DropTarget<
  ITagCollectionListItemProps,
  IDropProps
>(
  [COLLECTION_DRAG_TYPE, TAG_DRAG_TYPE],
  tagCollectionDropTarget,
  collectDropTarget,
)(
  DragSource<
    ITagCollectionListItemProps,
    IDragProps
  >(
    COLLECTION_DRAG_TYPE,
    tagCollectionDragSource,
    collectDragSource,
  )(TagCollectionListItem),
);

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
}
const TagCollectionListItemContextMenu = ({
  collection, onNewTag, onNewCollection, enableEditing, onExpandAll, onCollapseAll, onRemove,
  onAddSelectionToQuery, onReplaceQuery, onMoveUp, onMoveDown,
}: ITagCollectionContextMenu) => {
  // TODO: This is isn't being used atm, but it was intended for an alert dialog which we can finish later
  const [isRemoveAlertOpen, setRemoveAlertOpen] = useState(false);
  // const handleOpenRemoveAlert = useCallback(() => setRemoveAlertOpen(true), []);
  const handleCancelRemoveAlert = useCallback(() => setRemoveAlertOpen(false), []);
  const handleConfirmRemoveAlert = useCallback(
    () => {
      setRemoveAlertOpen(false);
      if (onRemove) {
        onRemove();
      }
    },
    [],
  );

  return (
    <Menu>
      {/* Todo: Alert immediately disappears when rerendering due to ugly TagTree code. So, no alert for now... */}
      <Alert
        isOpen={isRemoveAlertOpen}
        confirmButtonText="Remove"
        onConfirm={handleConfirmRemoveAlert}
        cancelButtonText="Cancel"
        onCancel={handleCancelRemoveAlert}
        icon={IconSet.DELETE}
        intent="danger"
      >
        Are you sure you want to remove the collection <b>{collection.name}</b>?
        This will also remove all of its tags and the collections it contains,
        in addition to removing those tags from all files associated with those tags.
      </Alert>

      <MenuItem onClick={onNewTag} text="New tag" icon={IconSet.TAG_ADD} />
      <MenuItem onClick={onNewCollection} text="New collection" icon={IconSet.COLLECTION_ADD} />
      <MenuItem onClick={enableEditing} text="Rename" icon={IconSet.EDIT} />
      <MenuItem onClick={handleConfirmRemoveAlert} text="Delete (999)" icon={IconSet.DELETE} disabled={!onRemove} />
      <Divider />
      <MenuItem onClick={onExpandAll} text="Expand all" icon="expand-all" />
      <MenuItem onClick={onCollapseAll} text="Collapse all" icon="collapse-all" />
      <Divider />
      <MenuItem onClick={onMoveUp} text="Move up" icon="arrow-up" />
      <MenuItem onClick={onMoveDown} text="Move down" icon="arrow-down" />
      <Divider />
      <MenuItem onClick={onAddSelectionToQuery} text="Add to search query" icon={IconSet.SEARCH} />
      <MenuItem onClick={onReplaceQuery} text="Replace search query" icon="blank" />
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
        {
          isEditing
            ? <ModifiableTagListItem
              initialName={tagCollection.name}
              onRename={this.handleRename}
              onAbort={this.handleRenameAbort}
            />
            : <DraggableTagCollectionListItem {...this.props} />
        }
      </div>
    );
  }

  renderContextMenu() {
    this.updateState({ isContextMenuOpen: true });
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
      />
    );
  }

  handleRemove = () => {
    const{ onRemove, tagCollection } = this.props;
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
