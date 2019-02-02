import { Button, ControlGroup, InputGroup, Tag } from "@blueprintjs/core";
import { observer } from 'mobx-react-lite';
import React, { useState } from 'react';


import TagListItem from './TagListItem';

import { withRootstore } from '../contexts/StoreContext';
import DomainTag from '../domain-objects/Tag';
import RootStore from '../stores/RootStore';

export interface ITagListProps {
  rootStore?: RootStore;
}

const TagList = ({ rootStore: { tagStore } }: ITagListProps) => {

  const [newTag, setNewTag] = useState('');

  const handleRename = (tag: DomainTag, name: string) => {
    tag.name = name;
  };

  return (
    <>
      {
        tagStore.tagList.map((tag, tagIndex) => (
          <div key={`tag-${tag.id}`} className="listItem">
            <TagListItem
              name={tag.name}
              onRemove={() => tagStore.removeTag(tag)}
              onRename={(name) => handleRename(tag, name)}
            />
          </div>
        ))
      }

      <form
        onSubmit={(e) => {
          e.preventDefault();
          tagStore.addTag(newTag); setNewTag('');
        }}
      >
        <ControlGroup
          fill={true}
          vertical={false}
          onAbort={() => setNewTag('')}
        >
          <InputGroup
            placeholder="New tag"
            onChange={(e) => setNewTag(e.target.value)}
            value={newTag}
          />
          <Button icon="add" type="submit" />
        </ControlGroup>
      </form>
    </>
  );
};

export default withRootstore(observer(TagList));
