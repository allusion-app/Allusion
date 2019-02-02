import { Button, ControlGroup, InputGroup, Tag } from '@blueprintjs/core';
import React, { useRef, useState } from 'react';

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
  onRemove: () => void;
  onRename: (name: string) => void;
}

const TagListItem = ({ name, onRemove, onRename }: ITagListItemProps) => {
  const [isEditing, setEditing] = useState(false);

  return isEditing ? (
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
  );
};

export default TagListItem;
