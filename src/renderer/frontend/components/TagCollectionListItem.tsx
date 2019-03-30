import { ClientTagCollection } from '../../entities/TagCollection';
import { ContextMenuTarget, Menu, MenuItem } from '@blueprintjs/core';
import { ModifiableTagListItem, TAG_DRAG_TYPE } from './TagListItem';
import React, { useState, useEffect } from 'react';
import {
  DragSource, DragSourceConnector, DragSourceMonitor, ConnectDragSource,
  DropTarget, DropTargetConnector, DropTargetMonitor, ConnectDropTarget, DropTargetSpec, DragSourceSpec,
} from 'react-dnd';
import { ID } from '../../entities/ID';

export const COLLECTION_DRAG_TYPE = 'collection';

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
  hoverTimeToExpand?: number;
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
  hoverTimeToExpand = 400,
}: ITagCollectionListItemProps & IDropProps & IDragProps) => {
  // When hovering over a collection for some time, automatically expand it
  const [expandTimeout, setExpandTimeout] = useState(0);
  useEffect(() => {
    if (!canDrop) {
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
    canDrop && !isDragging && isHovering ? 'reorder-target' : ''
    } ${isDragging ? 'reorder-source' : ''}`;
  return connectDropTarget(
    connectDragSource(<div className={className}>{tagCollection.name}</div>),
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

function collectDropTarget(connect: DropTargetConnector, monitor: DropTargetMonitor) {
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

function collectDragSource(connect: DragSourceConnector, monitor: DragSourceMonitor) {
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
const TagCollectionListItemContextMenu = (
  onNewTag: () => void,
  onNewCollection: () => void,
  enableEditing: () => void,
  onRemove: () => void,
  onExpandAll: () => void,
  onCollapseAll: () => void,
) => {
  // Todo: Change color. Would be nice to have some presets and a custom option (hex code and/or color wheel)
  const handleChangeColor = () => console.log('Change color');
  const onProperties = () => console.log('Show properties');

  return (
    <Menu>
      <MenuItem onClick={onNewTag} text="New tag" icon="tag" />
      <MenuItem onClick={onNewCollection} text="New collection" icon="folder-new" />
      <MenuItem onClick={enableEditing} text="Rename" icon="edit" />
      <MenuItem onClick={onRemove} text="Delete" icon="trash" disabled={!onRemove} />
      <MenuItem onClick={handleChangeColor} text="Change color" icon="circle" />
      <MenuItem onClick={onExpandAll} text="Expand all" icon="expand-all" />
      <MenuItem onClick={onCollapseAll} text="Collapse all" icon="collapse-all" />
      <MenuItem onClick={onProperties} text="Properties" icon="properties" />
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
      <div className={this.state.isContextMenuOpen ? 'contextMenuTarget' : ''}>
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
    return TagCollectionListItemContextMenu(
      this.props.onAddTag,
      this.props.onAddCollection,
      () => this.setEditing(true),
      () => this.props.onRemove && this.props.onRemove(this.props.tagCollection),
      this.props.onExpandAll,
      this.props.onCollapseAll,
    );
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
