import React from 'react';
import { ITag } from "../classes/Tag";

export interface ITagProps {
  tag: ITag;
  count: number;
  isSelected?: boolean;
}

export interface ITagListProps {
  tags: ITagProps[];
  onClickTag?: (tag: ITag) => void;
  onAddTag?: (tag: string) => void;
  onDragOnTag?: (tag: ITag, e: any) => void;
  onRemoveTag?: (tag: ITag) => void;
}

const TagList = ({ tags, onClickTag, onRemoveTag }: ITagListProps) => (
  <div>
    {
      tags.map(({ tag, count, isSelected }, tagIndex) => (
        <div key={`tag-${tagIndex}`}>
          <span onClick={() => onClickTag(tag)}>{tag.name}</span>
          <button onClick={() => onRemoveTag(tag)}>x</button>
          <span>({count})</span>
        </div>
      ))
    }
  </div>
);

export default TagList;
