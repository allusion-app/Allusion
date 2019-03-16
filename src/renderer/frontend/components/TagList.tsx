import { observer } from 'mobx-react-lite';
import React, { useState } from 'react';

import TagListItem, {
  // StaticTagListItem,
  // ModifiableTagListItem,
} from './TagListItem';

import { withRootstore, IRootStoreProp } from '../contexts/StoreContext';
import { Tree, ITreeNode } from '@blueprintjs/core';
import TagCollectionListItem from './TagCollectionListItem';
import { ClientTagCollection, ROOT_TAG_COLLECTION_ID } from '../../entities/TagCollection';
import TagCollectionStore from '../stores/TagCollectionStore';

interface IExpandState {
  [key: string]: boolean;
}

const hierarchyId = 'hierarchy';
const systemTagsId = 'system-tags';

/** Recursve function that sets the 'expand' state for each (sub) collection */
const setExpandStateRecursively = (col: ClientTagCollection, val: boolean, expandState: IExpandState): IExpandState => {
  col.clientSubCollections.forEach((subCol) => {
    setExpandStateRecursively(subCol, val, expandState);
  });
  expandState[col.id] = val;
  return expandState;
};

/** Recursive function that generates a tree of collections and tags */
const createTagCollectionTreeNode = (
  col: ClientTagCollection,
  expandState: IExpandState,
  store: TagCollectionStore,
  setExpandState: (state: IExpandState) => void,
): ITreeNode => ({
  id: col.id,
  icon: 'folder-close',
  label: (
    <TagCollectionListItem
      tagCollection={col}
      onRemove={() => store.removeTagCollection(col)}
      onAddTag={() => {
        store.rootStore.tagStore.addTag('New tag')
          .then((tag) => col.tags.push(tag.id));
        }
      }
      onAddCollection={() => {
        const newCol = store.addTagCollection('New collection', col);
        expandState[newCol.id] = true; // immediately expand after adding
      }}
      onExpandAll={() => setExpandState(setExpandStateRecursively(col, true, expandState))}
      onCollapseAll={() => setExpandState(setExpandStateRecursively(col, false, expandState))}
    />
  ),
  hasCaret: true,
  isExpanded: expandState[col.id],
  childNodes: [
    ...col.clientSubCollections.map(
      (subCol) => createTagCollectionTreeNode(subCol, expandState, store, setExpandState)),
    ...col.clientTags.map((tag): ITreeNode => ({
      id: tag.id,
      icon: 'tag',
      label: (
        <TagListItem
          name={tag.name}
          id={tag.id}
          onRemove={() => store.rootStore.tagStore.removeTag(tag)}
          onRename={(name) => { tag.name = name; }}
        />
      ),
    })),
  ],
});

export interface ITagListProps extends IRootStoreProp {}

const TagList = ({ rootStore: { tagStore, tagCollectionStore } }: ITagListProps) => {
  // Keep track of folders that have been expanded. The two main folders are expanded by default.
  const [expandState, setExpandState] = useState<IExpandState>({
    [hierarchyId]: true,
    [systemTagsId]: true,
  });

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

  const root = tagCollectionStore.tagCollectionList.find((col) => col.id === ROOT_TAG_COLLECTION_ID);
  const hierarchy: ITreeNode[] = root
    ? [createTagCollectionTreeNode(root, expandState, tagCollectionStore, setExpandState)]
    : [];

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
    ...hierarchy,
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
