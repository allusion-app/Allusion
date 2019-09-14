import React, { useState, useEffect } from 'react';

import { useDrag, useDrop } from 'react-dnd';
import {
  ControlGroup,
  InputGroup,
  IconName,
  ContextMenuTarget,
  Menu,
  MenuItem,
  Divider,
  Icon,
} from '@blueprintjs/core';

import { ID } from '../../../entities/ID';
import IconSet from '../Icons';
import { getEmptyImage } from 'react-dnd-html5-backend';
import UiStore from '../../stores/UiStore';
import StoreContext, { IRootStoreProp } from '../../contexts/StoreContext';
import { formatTagCountText } from '../../utils';
import { ItemType, ITagDragItem } from '../DragAndDrop';
import { DEFAULT_TAG_NAME } from '.';
import { ClientTag } from '../../../entities/Tag';
import { observer } from 'mobx-react-lite';

interface IUnmodifiableTagListItemProps {
  tag: ClientTag;
  name: string;
  onRemove: () => void;
  onEdit: () => void;
}

const UnmodifiableTagListItem = observer(({ name, tag }: IUnmodifiableTagListItemProps) => (
  <div className={'tagLabel'}>{name}</div>
));

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
          onFocus={(e) => {
            setFocused(true);
            e.target.select();
          }}
          // Only show red outline when input field is in focus and text is invalid
          className={isFocused && !isValidInput ? 'bp3-intent-danger' : ''}
        />
        {/* <Button icon={icon} type="submit"/> */}
      </ControlGroup>
    </form>
  );
};

interface ITagListItemProps {
  tag: ClientTag;
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

/** The main tag-list-item that can be renamed, removed and dragged */
export const TagListItem = ({
  tag,
  id,
  name,
  onRemove,
  onRename,
  onMoveTag,
  isSelected,
  isEditing,
  setEditing,
  uiStore,
}: ITagListItemProps & IEditingProps & { uiStore: UiStore } ) => {
  const [{ isDragging }, connectDragSource, connectDragPreview] = useDrag({
    item: { type: ItemType.Tag },
    begin: () => ({ type: ItemType.Tag, id, name, isSelected }),
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const [{ isHovering }, connectDropTarget] = useDrop({
    accept: ItemType.Tag,
    drop: (_, monitor) => {
      // Move the tag to the position where it is dropped (could be other collection as well)
      const item = monitor.getItem();
      if (item.id !== id) {
        onMoveTag(item);
      }
    },
    canDrop: (_, monitor) => {
      const item = monitor.getItem();

      // If a dragged item is selected, make sure nothing in the selection is dropped into itself
      if (item.isSelected) {
        return uiStore.tagSelection.find((selTagId) => selTagId === id) === undefined;
      }

      // You cannot drop a tag on itself
      return id !== item.id;
    },
    collect: (monitor) => ({
      isHovering: monitor.isOver(),
    }),
  });
  // Hide preview, since a custom preview is created in DragLayer
  useEffect(() => {
    connectDragPreview(getEmptyImage());
  }, []);

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
              tag={tag}
              name={name}
              onEdit={() => setEditing(true)}
              onRemove={onRemove}
            />
          )}
      </div>,
    ),
  );
};

interface IColorOptions {
  label: string;
  value: string;
}

export const defaultColorOptions: IColorOptions[] = [
  { label: 'Default', value: '' },
  // { label: 'Red', value: '#A82A2A' },
  // { label: 'Green', value: '#0A6640' },
  // { label: 'Orange', value: '#A66321' },
  // { label: 'Vermillion', value: '#9E2B0E' },
  // { label: 'Rose', value: '#A82255' },
  // { label: 'Violet', value: '#5C255C' },
  // { label: 'Indigo', value: '#5642A6' },
  // { label: 'Cobalt', value: '#1F4B99' },
  // { label: 'Turquoise', value: '#008075' },
  // { label: 'Forest', value: '#1D7324' },
  // { label: 'Sepia', value: '#63411E' },
  // Added more vivid colors, better in this UI
  { label: 'Eminence', value: '#5f3292' },
  { label: 'Indigo', value: '#5642A6' },
  { label: 'Blue Ribbon', value: '#143ef1' },
  { label: 'Azure Radiance', value: '#147df1' },
  { label: 'Aquamarine', value: '#6cdfe3' },
  { label: 'Aero Blue', value: '#bdfce4' },
  { label: 'Golden Fizz', value: '#f7ea3a' },
  { label: 'Goldenrod', value: '#fcd870' },
  { label: 'Christineapprox', value: '#f36a0f' },
  { label: 'Crimson', value: '#ec1335' },
  { label: 'Razzmatazz', value: '#ec125f' },
];

interface IColorPickerMenuProps {
  selectedColor: string;
  onChange: (color: string) => any;
  contextText: string;
}
export const ColorPickerMenu = ({ selectedColor, onChange, contextText }: IColorPickerMenuProps) => {
  return (
    <MenuItem
      text={`Color${contextText}`}
      icon={<Icon icon={selectedColor ? IconSet.COLOR : IconSet.COLOR} color={selectedColor} />}
    >
      {defaultColorOptions.map(({ label, value }) => (
        <MenuItem
          key={label}
          text={label}
          onClick={() => onChange(value)}
          icon={
            <Icon
              icon={selectedColor === value ? 'tick-circle' : (value ? 'full-circle' : 'circle')}
              color={value || '#007af5'}
            />
          }
        />
      ))}
    </MenuItem>
  );
};

interface ITagListItemContextMenuProps {
  setEditing: (value: boolean) => void;
  onRemove: () => void;
  onAddSelectionToQuery: () => void;
  onReplaceQuery: () => void;
  numTagsInContext: number;
  numColsInContext: number;
  onChangeColor: (tag: ID, color: string) => void;
  tag: ClientTag;
}

export const TagListItemContextMenu = ({
  setEditing,
  onRemove,
  onAddSelectionToQuery,
  onReplaceQuery,
  numTagsInContext,
  numColsInContext,
  onChangeColor,
  tag,
}: ITagListItemContextMenuProps) => {
  const handleRename = () => {
    setEditing(true);
  };

  const handleSetColor = (col: string) => onChangeColor(tag.id, col);

  let contextText = formatTagCountText(numTagsInContext, numColsInContext);
  contextText = contextText && ` (${contextText})`;

  return (
    <Menu>
      <MenuItem onClick={handleRename} text="Rename" icon={IconSet.EDIT} />
      <MenuItem onClick={onRemove} text={`Delete${contextText}`} icon={IconSet.DELETE} />
      <ColorPickerMenu selectedColor={tag.color} onChange={handleSetColor} contextText={contextText} />
      <Divider />
      <MenuItem onClick={onAddSelectionToQuery} text="Add to search query" icon={IconSet.SEARCH} />
      <MenuItem onClick={onReplaceQuery} text="Replace search query" icon={IconSet.REPLACE} />
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
    if (
      this.props.name === DEFAULT_TAG_NAME &&
      new Date().getTime() - this.props.dateAdded.getTime() < 200
    ) {
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
            <TagListItem
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
        numColsInContext={ctx.collections.length}
        numTagsInContext={Math.max(0, ctx.tags.length - 1)}
        onChangeColor={this.onChangeColor}
      />
    );
  }

  onChangeColor = (id: ID, color: string) => {
    this.props.rootStore.uiStore.colorSelectedTagsAndCollections(id, color);
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
