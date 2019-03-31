import React, { useState } from 'react';

import {
  DragSource,
  ConnectDragSource,
  DragSourceConnector,
  DragSourceMonitor,
  DropTarget,
  DropTargetSpec,
  ConnectDropTarget,
  DropTargetConnector,
  DropTargetMonitor,
} from 'react-dnd';
import {
  Button,
  ControlGroup,
  InputGroup,
  Tag,
  IconName,
  ContextMenuTarget,
  Menu,
  MenuItem,
} from '@blueprintjs/core';
import { ID } from '../../entities/ID';

export const TAG_DRAG_TYPE = 'tag';
export const DEFAULT_TAG_NAME = 'New tag';

interface IStaticTagListItemProps {
  name: string;
  onSelect: () => void;
}

/** Can be used for "non-existing" tags, e.g. 'Untagged', 'Recently added'. Cannot be removed */
export const StaticTagListItem = ({
  name,
  onSelect,
}: IStaticTagListItemProps) => (
  <Tag onClick={onSelect} large minimal fill interactive active>
    {name}
  </Tag>
);

interface IUnmodifiableTagListItemProps {
  name: string;
  onRemove: () => void;
  onClick: () => void;
}

const UnmodifiableTagListItem = ({
  name,
  onClick,
  onRemove,
}: IUnmodifiableTagListItemProps) => (
  <div onClick={onClick}>
    {name}
  </div>
);

interface IModifiableTagListItemProps {
  initialName: string;
  onRename: (name: string) => void;
  onAbort?: () => void;
  autoFocus?: boolean;
  icon?: IconName;
  placeholder?: string;
  resetOnSubmit?: boolean;
}

export const ModifiableTagListItem = ({
  initialName,
  onRename,
  onAbort = () => null, // no-op function by default
  autoFocus = true,
  icon = 'confirm',
  placeholder = 'Rename tag',
  resetOnSubmit = false,
}: IModifiableTagListItemProps) => {
  const [newName, setNewName] = useState(initialName);
  const [isFocused, setFocused] = useState(false);

  const isValidInput = newName.trim() !== '';

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (isValidInput) {
          onRename(newName);
          if (resetOnSubmit) {
            setNewName(initialName);
          }
        }
      }}>
      <ControlGroup fill={true} vertical={false} onAbort={onAbort}>
        <InputGroup
          placeholder={placeholder}
          onChange={(e: React.FormEvent<HTMLElement>) =>
            setNewName((e.target as HTMLInputElement).value)
          }
          value={newName}
          autoFocus={autoFocus}
          onBlur={() => {
            setFocused(false);
            onAbort();
          }}
          onFocus={(e) => { setFocused(true); e.target.select(); }}
          // Only show red outline when input field is in focus and text is invalid
          className={isFocused && !isValidInput ? 'bp3-intent-danger' : ''}
        />
        <Button icon={icon} type="submit" />
      </ControlGroup>
    </form>
  );
};

interface ITagListItemProps {
  name: string;
  id: ID;
  dateAdded: Date;
  onRemove: () => void;
  onRename: (name: string) => void;
  onMoveTag: (movedTag: ID) => void;
}

interface IEditingProps {
  isEditing: boolean;
  setEditing: (val: boolean) => void;
}

interface IDropProps {
  connectDropTarget: ConnectDropTarget;
  isHovering: boolean;
}

interface IDragProps {
  connectDragSource: ConnectDragSource;
  isDragging: boolean;
}

/** The main tag-list-item that can be renamed, removed and dragged */
export const TagListItem = ({
  name,
  onRemove,
  isEditing,
  setEditing,
  onRename,
  connectDragSource,
  connectDropTarget,
  isDragging,
  isHovering,
}: ITagListItemProps & IEditingProps & IDragProps & IDropProps) => {
  // Style whether the element is being dragged or hovered over to drop on
  const className = `${isHovering ? 'reorder-target' : ''
    } ${isDragging ? 'reorder-source' : ''}`;
  return connectDropTarget(
    connectDragSource(
      <div className={className}>
        {isEditing ? (
          <ModifiableTagListItem
            initialName={name}
            onRename={(newName) => {
              setEditing(false);
              onRename(newName);
            }}
            onAbort={() => setEditing(false)}
          />
        ) : (
          <UnmodifiableTagListItem
            name={name}
            onClick={() => setEditing(true)}
            onRemove={onRemove}
          />
        )}
      </div>,
    ),
  );
};

/** This handles what to do when an element is being dropped over this element */
const dropTarget: DropTargetSpec<ITagListItemProps> = {
  canDrop(props, monitor) {
    // You cannot drop a tag on itself
    const { id: draggedId } = monitor.getItem();
    return props.id !== draggedId;
  },
  drop(props, monitor) {
    // Move the tag to the position where it is dropped (could be other collection as well)
    const { id: draggedId } = monitor.getItem();
    if (draggedId !== props.id) {
      props.onMoveTag(draggedId);
    }
  },
};
const collectDropTarget = (connect: DropTargetConnector, monitor: DropTargetMonitor): IDropProps => {
  return {
    connectDropTarget: connect.dropTarget(),
    isHovering: monitor.isOver(),
  };
};

/** This handles what the drag-and-drop target receives when dropping the element */
const dragSource = {
  beginDrag: (props: ITagListItemProps) => ({ name: props.name, id: props.id }),
};
const collectDragSource = (connect: DragSourceConnector, monitor: DragSourceMonitor): IDragProps => ({
  connectDragSource: connect.dragSource(),
  isDragging: monitor.isDragging(),
});

/** Make the taglistitem draggable */
const DraggableTagListItem = DropTarget<
  ITagListItemProps & IEditingProps,
  IDropProps
>(
  TAG_DRAG_TYPE,
  dropTarget,
  collectDropTarget,
)(
  DragSource<
    ITagListItemProps & IEditingProps,
    IDragProps
  >(
    TAG_DRAG_TYPE,
    dragSource,
    collectDragSource,
  )(TagListItem),
);

const TagListItemContextMenu = (
  setEditing: (value: boolean) => void,
  onRemove: () => void,
) => {
  const handleRename = () => {
    setEditing(true);
  };

  const handleDelete = () => {
    onRemove();
  };

  const handleChangeColor = () => {
    // Todo: Change color. Would be nice to have some presets and a custom option (hex code and/or color wheel)
    console.log('Change color');
  };

  return (
    <Menu>
      <MenuItem onClick={handleRename} text="Rename" icon="edit" />
      <MenuItem onClick={handleDelete} text="Delete" icon="trash" />
      <MenuItem onClick={handleChangeColor} text="Change color" />
    </Menu>
  );
};

/** Wrapper that adds a context menu (with right click) */
@ContextMenuTarget
class TagListItemWithContextMenu extends React.PureComponent<
  ITagListItemProps,
  { isEditing: boolean; isContextMenuOpen: boolean }
> {
  state = {
    isEditing: false,
    isContextMenuOpen: false,
    _isMounted: false,
  };

  componentDidMount() {
    this.state._isMounted = true;
    // Todo: Fixme with something more competent
    // Hacky way to automatically go into edit mode for newly added tags. But it works :D
    if (this.props.name === DEFAULT_TAG_NAME && (new Date().getTime() - this.props.dateAdded.getTime()) < 200) {
      this.setState({ isEditing: true });
    }
  }

  componentWillUnmount() {
    this.state._isMounted = false;
  }

  render() {
    return (
      // Context menu/root element must supports the "contextmenu" event and the onContextMenu prop
      <div className={this.state.isContextMenuOpen ? 'contextMenuTarget' : ''}>
        <DraggableTagListItem
          {...this.props}
          isEditing={this.state.isEditing}
          setEditing={this.setEditing}
        />
      </div>
    );
  }

  renderContextMenu() {
    this.updateState({ isContextMenuOpen: true });
    return TagListItemContextMenu(this.setEditing, this.props.onRemove);
  }

  onContextMenuClose = () => {
    this.updateState({ isContextMenuOpen: false });
  }

  setEditing = (val: boolean) => {
    this.updateState({ isEditing: val });
  }

  private updateState = (updatableProp: any) => {
    if (this.state._isMounted) {
      this.setState(updatableProp);
    }
  }
}

export default TagListItemWithContextMenu;
