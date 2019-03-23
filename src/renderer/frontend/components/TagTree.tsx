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

const systemTagsId = 'system-tags';

/** Recursive function that sets the 'expand' state for each (sub) collection */
const setExpandStateRecursively = (col: ClientTagCollection, val: boolean, expandState: IExpandState): IExpandState => {
  col.clientSubCollections.forEach((subCol) => {
    setExpandStateRecursively(subCol, val, expandState);
  });
  expandState[col.id] = val;
  return expandState;
};

/** Recursive function that generates a tree ITreeNodes from TagCollections */
const createTagCollectionTreeNode = (
  col: ClientTagCollection,
  expandState: Readonly<IExpandState>,
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
        setExpandState({ ...expandState, [newCol.id]: true }); // immediately expand after adding
      }}
      // Destructure objects to make them into a new object, else the render won't trigger
      onExpandAll={() => setExpandState({ ...setExpandStateRecursively(col, true, expandState) })}
      onCollapseAll={() => setExpandState({ ...setExpandStateRecursively(col, false, expandState) })}
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
    [ROOT_TAG_COLLECTION_ID]: true,
    [systemTagsId]: true,
  });

  const handleNodeCollapse = (node: ITreeNode) => {
    setExpandState({ ...expandState, [node.id]: false });
  };

  const handleNodeExpand = (node: ITreeNode) => {
    setExpandState({ ...expandState, [node.id]: true });
  };

  const root = tagCollectionStore.tagCollectionList.find((col) => col.id === ROOT_TAG_COLLECTION_ID);
  // Todo: Not sure what the impact is of generating the hierarchy in each render on performance.
  // Usually the hierarchy is stored directly in the state, but we can't do that since it it managed by the TagCollectionStore.
  // Or maybe we can, but then the ClientTagCollection needs to extends ITreeNode, which messes up the responsibility of the Store and the state required by the view...
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
      onNodeCollapse={handleNodeCollapse}
      onNodeExpand={handleNodeExpand}
    />

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
