import { inject, observer } from 'mobx-react';
import React from 'react';
import RootStore from '../stores/RootStore';
import TagStore from '../stores/TagStore';

export interface ITagListProps {
  rootStore?: RootStore;
}

const TagList = ({ rootStore: { tagStore } }: ITagListProps) => (
  <div>
    {
      tagStore.tagList.map((tag, tagIndex) => (
        <div key={`tag-${tagIndex}`}>
          <span onClick={() => console.log(tag)}>{tag.name}</span>
          <button onClick={() => tagStore.removeTag(tag)}>x</button>
        </div>
      ))
    }
    <button onClick={() => tagStore.addTag(`random tag here ${Math.random()}`)}>
      Add tag
    </button>
  </div>
);

export default inject('rootStore')(observer(TagList));
