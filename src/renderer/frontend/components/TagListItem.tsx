import React, { useRef, useState } from 'react';

import {
  DragSource,
  ConnectDragSource,
  DragSourceConnector,
  DragSourceMonitor,
} from 'react-dnd';
import { Button, ControlGroup, InputGroup, Tag } from '@blueprintjs/core';
import { ID } from '../../entities/ID';

interface IStaticTagListItemProps {
  name: string;
  onSelect: () => void;
}
/** Can be used for "non-existing" tags, e.g. 'Untagged', 'Recently added'. Cannot be removed */
export const StaticTagListItem = ({ name, onSelect }: IStaticTagListItemProps) => (
  <Tag
    onClick={onSelect}
    large
    minimal
    fill
    interactive
    active
  >
    {name}
  </Tag>
);


interface IUnmodifiableTagListItemProps {
  name: string;
  onRemove: () => void;
  onClick: () => void;
}
const UnmodifiableTagListItem = ({ name, onClick, onRemove }: IUnmodifiableTagListItemProps) => (
  <Tag
    onClick={onClick}
    large
    minimal
    fill
    onRemove={onRemove}
    interactive
  >
    {name}
  </Tag>
);

interface IModifiableTagListItemProps {
  initialName: string;
  onRename: (name: string) => void;
  onAbort: () => void;
}

const ModifiableTagListItem = ({ initialName, onRename, onAbort }: IModifiableTagListItemProps) => {
  const [newName, setNewName] = useState(initialName);
  const inputEl = useRef<InputGroup>(null);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onRename(newName);
      }}
    >
      <ControlGroup
        fill={true}
        vertical={false}
        onAbort={onAbort}
      >
        <InputGroup
          placeholder="Rename tag"
          onChange={(e) => setNewName(e.target.value)}
          value={newName}
          onBlur={onAbort}
          ref={inputEl}
          autoFocus={true}
        />
        <Button icon="confirm" type="submit" />
      </ControlGroup>
    </form>
  );
};

interface ITagListItemProps {
  name: string;
  id: ID;
  onRemove: () => void;
  onRename: (name: string) => void;
}
interface ITagListItemCollectedProps {
  connectDragSource: ConnectDragSource;
  isDragging: boolean;
}
/** The main tag-list-item that can be renamed, removed and dragged */
const TagListItem = ({
  name, onRemove, onRename, connectDragSource, isDragging,
}: ITagListItemProps & ITagListItemCollectedProps) => {
  const [isEditing, setEditing] = useState(false);

  return connectDragSource(
    <div>
      {
        isEditing ? (
          <ModifiableTagListItem
            initialName={name}
            onRename={(newName) => { setEditing(false); onRename(newName); }}
            onAbort={() => setEditing(false)}
          />
        ) : (
          <UnmodifiableTagListItem
            name={name}
            onClick={() => setEditing(true)}
            onRemove={onRemove}
          />
        )
      }
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
