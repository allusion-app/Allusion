import React, { useState, useEffect } from 'react';

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
  ConnectDragPreview,
} from 'react-dnd';
import {
  ControlGroup,
  InputGroup,
  Tag,
  IconName,
  ContextMenuTarget,
  Menu,
  MenuItem,
  Divider,
} from '@blueprintjs/core';

import { ID } from '../../entities/ID';
import IconSet from './Icons';
import { getEmptyImage } from 'react-dnd-html5-backend';
import UiStore from '../stores/UiStore';
import StoreContext, { IRootStoreProp } from '../contexts/StoreContext';
import { formatTagCountText } from '../utils';

export const TAG_DRAG_TYPE = 'tag';
export const DEFAULT_TAG_NAME = 'New tag';

interface IStaticTagListItemProps {
  name: string;
}

/** Can be used for "non-existing" tags, e.g. 'Untagged', 'Recently added'. Cannot be removed */
export const StaticTagListItem = ({
  name,
}: IStaticTagListItemProps) => (
  <Tag large minimal fill interactive active>
    {name}
  </Tag>
);

interface IUnmodifiableTagListItemProps {
  name: string;
  onRemove: () => void;
  onEdit: () => void;
}

const UnmodifiableTagListItem = ({
  name,
}: IUnmodifiableTagListItemProps) => (
  <div className={'tagLabel'}>
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
        {/* <Button icon={icon} type="submit"/> */}
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
  onMoveTag: (dropProps: ITagDragItem) => void;
  onAddSelectionToQuery: () => void;
  onReplaceQuery: () => void;
  onSelect: (tagId: ID, clear?: boolean) => void;
  isSelected: boolean;
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
  connectDragPreview: ConnectDragPreview;
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
  connectDragPreview,
  isDragging,
  isHovering,
}: ITagListItemProps & IEditingProps & IDragProps & IDropProps) => {
  // Hide preview, since a custom preview is created in DragLayer
  useEffect(() => { connectDragPreview(getEmptyImage()); }, []);

  // Style whether the element is being dragged or hovered over to drop on
  const className = `${isHovering ? 'reorder-target' : ''} ${isDragging ? 'reorder-source' : ''}`;
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
            onEdit={() => setEditing(true)}
            onRemove={onRemove}
          />
        )}
      </div>,
    ),
  );
};

/** This handles what to do when an element is being dropped over this element */
const dropTarget: DropTargetSpec<ITagListItemProps & { uiStore: UiStore }> = {
  canDrop(props, monitor) {
    const { id: draggedId, isSelected }: ITagDragItem = monitor.getItem() as ITagDragItem;

    // If a dragged item is selected, make sure nothing in the selection is dropped into itself
    if (isSelected) {
      return props.uiStore.tagSelection.find((selTagId) => selTagId === props.id) === undefined;
    }

    // You cannot drop a tag on itself
    return props.id !== draggedId;
  },
  drop(props, monitor) {
    // Move the tag to the position where it is dropped (could be other collection as well)
    const { id: draggedId } = monitor.getItem() as ITagDragItem;
    if (draggedId !== props.id) {
      props.onMoveTag(monitor.getItem());
    }
  },
};
const collectDropTarget = (connect: DropTargetConnector, monitor: DropTargetMonitor): IDropProps => {
  return {
    connectDropTarget: connect.dropTarget(),
    isHovering: monitor.isOver(),
  };
};

export interface ITagDragItem {
  name: string;
  id: string;
  isSelected: boolean;
}

/** This handles what the drag-and-drop target receives when dropping the element */
const dragSource = {
  beginDrag: (props: ITagListItemProps): ITagDragItem => {
    return ({ name: props.name, id: props.id, isSelected: props.isSelected });
  },
};

const collectDragSource = (connect: DragSourceConnector, monitor: DragSourceMonitor): IDragProps => ({
  connectDragSource: connect.dragSource(),
  connectDragPreview: connect.dragPreview(),
  isDragging: monitor.isDragging(),
});

/** Make the taglistitem draggable */
const DraggableTagListItem = DropTarget<
  ITagListItemProps & IEditingProps & { uiStore: UiStore },
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

interface ITagListItemContextMenuProps {
  setEditing: (value: boolean) => void;
  onRemove: () => void;
  onAddSelectionToQuery: () => void;
  onReplaceQuery: () => void;
  numTagsToDelete: number;
  numColsToDelete: number;
}
const TagListItemContextMenu = ({
  setEditing,
  onRemove,
  onAddSelectionToQuery,
  onReplaceQuery,
  numTagsToDelete,
  numColsToDelete,
}: ITagListItemContextMenuProps,
) => {
  const handleRename = () => {
    setEditing(true);
  };

  const handleChangeColor = () => {
    // Todo: Change color. Would be nice to have some presets and a custom option (hex code and/or color wheel)
    console.log('Change color');
    alert('Not implemented yet');
  };

  let deleteText = formatTagCountText(numTagsToDelete, numColsToDelete);
  deleteText = deleteText && ` (${deleteText})`;

  return (
    <Menu>
      <MenuItem onClick={handleRename} text="Rename" icon={IconSet.EDIT} />
      <MenuItem onClick={onRemove} text={`Delete${deleteText}`} icon={IconSet.DELETE} />
      <MenuItem onClick={handleChangeColor} text="Change color" icon="circle" disabled />
      <Divider />
      <MenuItem onClick={onAddSelectionToQuery} text="Add to search query" icon={IconSet.SEARCH} />
      <MenuItem onClick={onReplaceQuery} text="Replace search query" icon="blank" />
    </Menu>
  );
};

/** Wrapper that adds a context menu (with right click) */
@ContextMenuTarget
class TagListItemWithContextMenu extends React.PureComponent<
  ITagListItemProps & IRootStoreProp,
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
        <StoreContext.Consumer>
          {({ uiStore }) => (
            <DraggableTagListItem
              {...this.props}
              isEditing={this.state.isEditing}
              setEditing={this.setEditing}
              uiStore={uiStore}
            />
          )}
        </StoreContext.Consumer>
      </div>
    );
  }

  renderContextMenu() {
    this.updateState({ isContextMenuOpen: true });
    const ctx = this.props.rootStore.uiStore.getTagContextItems(this.props.id);
    return (
      <TagListItemContextMenu
        {...this.props}
        setEditing={this.setEditing}
        numColsToDelete={ctx.collections.length}
        numTagsToDelete={Math.max(0, ctx.tags.length - 1)}
      />
    );
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
