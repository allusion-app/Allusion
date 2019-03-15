import { observer } from 'mobx-react-lite';
import React, { useState } from 'react';

import TagListItem, {
  // StaticTagListItem,
  // ModifiableTagListItem,
} from './TagListItem';

import { ClientTag } from '../../entities/Tag';
import { withRootstore, IRootStoreProp } from '../contexts/StoreContext';
import { Tree, ITreeNode } from '@blueprintjs/core';

interface IExpandState {
  [key: string]: boolean;
}

const hierarchyId = 'hierarchy';
const systemTagsId = 'system-tags';

export interface ITagListProps extends IRootStoreProp {}

const TagList = ({ rootStore: { tagStore } }: ITagListProps) => {
  // Keep track of folders that have been expanded. The two main folders are expanded by default.
  const [expandState, setExpandState] = useState<IExpandState>({
    [hierarchyId]: true,
    [systemTagsId]: true,
  });

  const handleRename = (tag: ClientTag, name: string) => {
    tag.name = name;
  };

  const handleTagClick = (node: ITreeNode) => {
    console.log(node);
  };

  const handleNodeCollapse = (node: ITreeNode) => {
    expandState[node.id] = false;
    setExpandState(expandState);
  };

  const handleNodeExpand = (node: ITreeNode) => {
    expandState[node.id] = true;
    setExpandState(expandState);
  };

  const hierarchy: ITreeNode[] = tagStore.tagList.map((tag) => ({
    id: tag.id,
    label: (
      <TagListItem
        name={tag.name}
        id={tag.id}
        onRemove={() => tagStore.removeTag(tag)}
        onRename={(name) => handleRename(tag, name)}
      />
    ),
  }));

  const systemTags: ITreeNode[] = [
    {
      id: 'untagged',
      label: 'Untagged',
      icon: 'tag',
    },
    {
      id: 'all-tags',
      label: 'All tags',
      icon: 'tag',
    },
  ];

  const treeContents: ITreeNode[] = [
    {
      id: hierarchyId,
      icon: 'folder-close',
      label: 'Hierarchy',
      hasCaret: true,
      isExpanded: expandState[hierarchyId],
      childNodes: hierarchy,
    },
    {
      id: systemTagsId,
      icon: 'folder-close',
      label: 'System tags',
      hasCaret: true,
      isExpanded: expandState[systemTagsId],
      childNodes: systemTags,
    },
  ];

  return (
    // <>
    <Tree
      contents={treeContents}
      onNodeClick={handleTagClick}
      onNodeCollapse={handleNodeCollapse}
      onNodeExpand={handleNodeExpand}
    />
      // <StaticTagListItem
      //   name="All images"
      //   onSelect={() => {
      //     console.log('All images');
      //   }}
      // />

      // {tagStore.tagList.map((tag) => (
      //   <div key={`tag-${tag.id}`} className="listItem">
      //     <TagListItem
      //       name={tag.name}
      //       id={tag.id}
      //       onRemove={() => tagStore.removeTag(tag)}
      //       onRename={(name) => handleRename(tag, name)}
      //     />
      //   </div>
      // ))}

      // {/* New tag input field */}
      // <ModifiableTagListItem
      //   placeholder="New tag"
      //   icon="add"
      //   initialName={''}
      //   onRename={(name) => tagStore.addTag(name)}
      //   resetOnSubmit
      //   autoFocus={false}
      // />
    // </>
  );
};

export default withRootstore(observer(TagList));
