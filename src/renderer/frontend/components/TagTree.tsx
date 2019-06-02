import { observer, useComputed } from 'mobx-react-lite';
import React, { useState, useCallback, useMemo } from 'react';

import TagListItem, { DEFAULT_TAG_NAME } from './TagListItem';

import { withRootstore, IRootStoreProp } from '../contexts/StoreContext';
import { Tree, ITreeNode, Button, Icon, ButtonGroup, TreeEventHandler } from '@blueprintjs/core';
import TagCollectionListItem from './TagCollectionListItem';
import { ClientTagCollection, ROOT_TAG_COLLECTION_ID } from '../../entities/TagCollection';
import TagCollectionStore from '../stores/TagCollectionStore';
import { ID } from '../../entities/ID';
import IconSet from './Icons';

interface IExpandState {
  [key: string]: boolean;
}

/** Recursive function that sets the 'expand' state for each (sub) collection */
const setExpandStateRecursively = (col: ClientTagCollection, val: boolean, expandState: IExpandState): IExpandState => {
  col.clientSubCollections.forEach((subCol) => {
    setExpandStateRecursively(subCol, val, expandState);
  });
  expandState[col.id] = val;
  return expandState;
};

/** Recursive function that generates a tree of ITreeNodes from TagCollections */
const createTagCollectionTreeNode = (
  col: ClientTagCollection,
  expandState: Readonly<IExpandState>,
  store: TagCollectionStore,
  setExpandState: (state: IExpandState) => void,
): ITreeNode => {

  const label = (
    <TagCollectionListItem
      tagCollection={col}
      // Disable deleting the root hierarchy
      onRemove={col.id === ROOT_TAG_COLLECTION_ID ? undefined : () => store.removeTagCollection(col)}
      onAddTag={() => {
        store.rootStore.tagStore.addTag(DEFAULT_TAG_NAME)
          .then((tag) => col.addTag(tag.id))
          .catch((err) => console.log('Could not create tag', err));
      }}
      onAddCollection={async () => {
        const newCol = await store.addTagCollection('New collection', col);
        setExpandState({ ...expandState, [newCol.id]: true }); // immediately expand after adding
      }}
      onExpand={() => setExpandState({ ...expandState, [col.id]: true })}
      // Destructure objects to make them into a new object, else the render won't trigger
      onExpandAll={() => setExpandState({ ...setExpandStateRecursively(col, true, expandState) })}
      onCollapseAll={() => setExpandState({ ...setExpandStateRecursively(col, false, expandState) })}
      onMoveCollection={(id) => {
        const movedCollectionParent = store.tagCollectionList.find((c) => c.subCollections.includes(id));
        if (movedCollectionParent) {
          movedCollectionParent.subCollections.remove(id);
          col.subCollections.push(id);
        }
      }}
      onMoveTag={(id) => {
        const movedCollectionParent = store.tagCollectionList.find((c) => c.tags.includes(id));
        if (movedCollectionParent) {
          // movedCollectionParent.removeTag(id);
          // col.addTag(id);

          // TODO: Dragging an unselected item should make that the only selected one
          // Then, instead of moving only this tag, we can move all selected tags (or collections)

          // Something like this.
          store.rootStore.uiStore.tagSelection.forEach((t) => {
            const tag = store.rootStore.tagStore.tagList.find((cTag) => cTag.id === t);
            if (tag) {
              tag.parent.removeTag(t);
              col.addTag(t);
            }
          });
        }
      }}
      onSelectionToQuery={store.rootStore.uiStore.tagSelectionToQuery}
    />
  );

  const childNodes = [
    ...col.clientSubCollections.map(
      (subCol) => createTagCollectionTreeNode(subCol, expandState, store, setExpandState)),
    ...col.clientTags.map((tag): ITreeNode => ({
      id: tag.id,
      icon: IconSet.TAG,
      isSelected: store.rootStore.uiStore.tagSelection.includes(tag.id),
      label: (
        <TagListItem
          name={tag.name}
          id={tag.id}
          dateAdded={tag.dateAdded}
          onRemove={() => store.rootStore.tagStore.removeTag(tag)}
          onRename={(name) => { tag.name = name; }}
          onMoveTag={(movedTagId) => {
            // Find original collection
            const origCol = store.tagCollectionList.find((c) => c.tags.includes(movedTagId));
            if (!origCol) { return console.error('Could not find original collection when moving tag', movedTagId); }
            // Find where to insert the moved tag
            const insertionIndex = col.tags.indexOf(tag.id);
            // Remove from orig collection
            origCol.removeTag(movedTagId);
            // Insert the moved tag to the position of the current tag where it was dropped
            col.tags.splice(insertionIndex, 0, movedTagId);
          }}
          onSelectionToQuery={store.rootStore.uiStore.tagSelectionToQuery}
        />
      ),
    })),
  ];

  return {
    id: col.id,
    icon: expandState[col.id] ? IconSet.TAG_GROUP_OPEN : IconSet.TAG_GROUP,
    isSelected: col.isSelected,
    hasCaret: true,
    isExpanded: expandState[col.id],
    label,
    childNodes,
  };
};

export interface ITagListProps extends IRootStoreProp { }

const TagList = ({ rootStore: { tagStore, tagCollectionStore, uiStore, fileStore } }: ITagListProps) => {
  // Keep track of folders that have been expanded. The two main folders are expanded by default.
  const [expandState, setExpandState] = useState<IExpandState>({
    [ROOT_TAG_COLLECTION_ID]: true,
  });

  const handleNodeCollapse = useCallback(
    (node: ITreeNode) => setExpandState({ ...expandState, [node.id]: false }),
    [expandState],
  );

  const handleNodeExpand = useCallback(
    (node: ITreeNode) => setExpandState({ ...expandState, [node.id]: true }),
    [expandState],
  );

  const handleNodeClick = useCallback(
    ({ id }: ITreeNode, nodePath: number[], e: React.MouseEvent) => {
      // The tags selected in this event
      const clickSelection: ID[] = [];
      let isClickSelectionSelected = false;

      // When clicking on a single tag...
      const clickedTag = tagStore.tagList.find((t) => t.id === id);
      if (clickedTag) {
        clickSelection.push(clickedTag.id);
        isClickSelectionSelected = uiStore.tagSelection.includes(clickedTag.id);
      }

      // When clicking on a collection
      const clickedCollection = tagCollectionStore.tagCollectionList.find((c) => c.id === id);
      if (clickedCollection) {
        // Get all tags recursively that are in this collection
        const getRecursiveTags = (col: ClientTagCollection): ID[] =>
          [...col.tags, ...col.clientSubCollections.flatMap(getRecursiveTags)];
        clickSelection.push(...getRecursiveTags(clickedCollection));

        isClickSelectionSelected = clickedCollection.isSelected;
      }

      // Based on the event options, add or subtract the clickSelection from the global tag selection
      if (e.ctrlKey || e.metaKey) {
        isClickSelectionSelected ? uiStore.deselectTags(clickSelection) : uiStore.selectTags(clickSelection);
      } else if (e.shiftKey) {
        // Todo: Take into account last selection index (like in gallery)
        // Requires some additional state
      } else {
        // Normal click: If it was the only one that was selected, deselect it
        const isOnlySelected = isClickSelectionSelected && uiStore.tagSelection.length === clickSelection.length;

        if (!isOnlySelected) {
          uiStore.selectTags(clickSelection, true);
        }
      }
    },
    [],
  );

  const handleNodeContextMenu: TreeEventHandler = useCallback(({ id }, nodePath, e) => {
    // When clicking on a single tag...
    const clickedTag = tagStore.tagList.find((t) => t.id === id);
    if (clickedTag) {
      if (!uiStore.tagSelection.includes(clickedTag.id)) {
        uiStore.selectTags([clickedTag.id], true);
      }
    }

    // When clicking on a collection
    const clickedCollection = tagCollectionStore.tagCollectionList.find((c) => c.id === id);
    if (clickedCollection) {
      // Get all tags recursively that are in this collection
      const getRecursiveTags = (col: ClientTagCollection): ID[] =>
        [...col.tags, ...col.clientSubCollections.flatMap(getRecursiveTags)];

      if (!clickedCollection.isSelected) {
        uiStore.selectTags(getRecursiveTags(clickedCollection), true);
      }
    }
  }, []);

  const root = tagCollectionStore.getRootCollection();
  // Todo: Not sure what the impact is of generating the hierarchy in each render on performance.
  // Usually the hierarchy is stored directly in the state, but we can't do that since it it managed by the TagCollectionStore.
  // Or maybe we can, but then the ClientTagCollection needs to extends ITreeNode, which messes up the responsibility of the Store and the state required by the view...
  const hierarchy: ITreeNode[] = useComputed(
    () => root
      ? [createTagCollectionTreeNode(root, expandState, tagCollectionStore, setExpandState)]
      : [],
    [root, expandState],
  );

  const treeContents: ITreeNode[] = useMemo(
    () => [
      ...hierarchy,
    ],
    [hierarchy],
  );

  return (
    <>
      <Tree
        contents={treeContents}
        onNodeCollapse={handleNodeCollapse}
        onNodeExpand={handleNodeExpand}
        onNodeClick={handleNodeClick}
      // TODO: Context menu from here instead of in the TagCollectionListItem
      // Then you can right-click anywhere instead of only on the label
      // https://github.com/palantir/blueprint/issues/3187
        onNodeContextMenu={handleNodeContextMenu}
      />

      <div id="system-tags">
        <ButtonGroup vertical minimal fill>
          <Button
            text="All images"
            icon={IconSet.MEDIA}
            rightIcon={uiStore.viewContent === 'all' ? <Icon intent="primary" icon="eye-open" /> : null}
            onClick={uiStore.viewContentAll}
            active={uiStore.viewContent === 'all'}
          />
          <Button
            text="Searched images"
            icon={IconSet.SEARCH}
            rightIcon={uiStore.viewContent === 'query' ? <Icon intent="primary" icon="eye-open" /> : null}
            onClick={uiStore.viewContentQuery}
            active={uiStore.viewContent === 'query'}
          />
          <Button
            text={`Untagged (${fileStore.numUntaggedFiles})`}
            icon={IconSet.TAG_BLANCO}
            rightIcon={
              uiStore.viewContent === 'untagged'
                ? <Icon icon="eye-open" />
                : (fileStore.numUntaggedFiles > 0
                  ? <Icon icon="issue" />
                  : null
                )
            }
            onClick={uiStore.viewContentUntagged}
            active={uiStore.viewContent === 'untagged'}
            intent={fileStore.numUntaggedFiles > 0 ? 'warning' : 'none'}
          />
        </ButtonGroup>
      </div>
    </>
  );
};

export default withRootstore(observer(TagList));
