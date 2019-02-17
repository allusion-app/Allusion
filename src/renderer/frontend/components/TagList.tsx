import { Button, ControlGroup, InputGroup } from '@blueprintjs/core';
import { observer } from 'mobx-react-lite';
import React, { useState, useRef } from 'react';

import TagListItem, { StaticTagListItem, ModifiableTagListItem } from './TagListItem';

import { ClientTag } from '../../entities/Tag';
import { withRootstore } from '../contexts/StoreContext';
import RootStore from '../stores/RootStore';

export interface ITagListProps {
  rootStore?: RootStore;
}

const TagList = ({ rootStore: { tagStore } }: ITagListProps) => {

  const [newTag, setNewTag] = useState('');

  const handleRename = (tag: ClientTag, name: string) => {
    tag.name = name;
  };

  const [isNewTagInputFocused, setFocus] = useState(false);

  const isValidInput = newTag.trim() !== '';

  return (
    <>
      <StaticTagListItem
        name="All images"
        onSelect={() => { console.log('All images'); }}
      />

      {
        tagStore.tagList.map((tag) => (
          <div key={`tag-${tag.id}`} className="listItem">
            <TagListItem
              name={tag.name}
              id={tag.id}
              onRemove={() => tagStore.removeTag(tag)}
              onRename={(name) => handleRename(tag, name)}
            />
          </div>
        ))
      }

      {/* New tag input field */}
      <ModifiableTagListItem
        placeholder="New tag"
        icon="add"
        initialName={''}
        onRename={(name) => tagStore.addTag(name)}
        resetOnSubmit
        autoFocus={false}
      />
    </>
  );
};

export default withRootstore(observer(TagList));
