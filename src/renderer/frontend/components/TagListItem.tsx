import React, { useState } from 'react';

import {
  DragSource,
  ConnectDragSource,
  DragSourceConnector,
  DragSourceMonitor,
} from 'react-dnd';
import {
  Button,
  ControlGroup,
  InputGroup,
  Tag,
  IconName,
} from '@blueprintjs/core';
import { ID } from '../../entities/ID';

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
  onSelect: () => void;
  onEdit: () => void;
}

const UnmodifiableTagListItem = ({
  name,
  onEdit,
  onSelect,
  onRemove,
}: IUnmodifiableTagListItemProps) => (
  <Tag onClick={onSelect} onDoubleClick={onEdit} large minimal fill onRemove={onRemove} interactive>
    {name}
  </Tag>
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
          onFocus={() => setFocused(true)}
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
  onRemove: () => void;
  onRename: (name: string) => void;
  onSelect: () => void;
}

interface ITagListItemCollectedProps {
  connectDragSource: ConnectDragSource;
  isDragging: boolean;
}

/** The main tag-list-item that can be renamed, removed and dragged */
const TagListItem = ({
  name,
  onRemove,
  onRename,
  onSelect,
  connectDragSource,
}: ITagListItemProps & ITagListItemCollectedProps) => {
  const [isEditing, setEditing] = useState(false);

  return connectDragSource(
    <div>
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
          onSelect={onSelect}
          onEdit={() => setEditing(true)}
          onRemove={onRemove}
        />
      )}
    </div>,
  );
};

const boxSource = {
  beginDrag(props: ITagListItemProps) {
    return {
      name: props.name,
      id: props.id,
    };
  },
};

/** Make the taglistitem draggable */
export default DragSource<ITagListItemProps, ITagListItemCollectedProps>(
  'tag',
  boxSource,
  (connect: DragSourceConnector, monitor: DragSourceMonitor) => ({
    connectDragSource: connect.dragSource(),
    isDragging: monitor.isDragging(),
  }),
)(TagListItem);
