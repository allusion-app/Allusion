import { observer, useComputed } from 'mobx-react-lite';
import React, { useState, useCallback, useEffect } from 'react';

import TagListItem, { DEFAULT_TAG_NAME, TAG_DRAG_TYPE } from './TagListItem';

import { withRootstore, IRootStoreProp } from '../contexts/StoreContext';
import { Tree, ITreeNode, Button, Icon, ButtonGroup, H4 } from '@blueprintjs/core';
import TagCollectionListItem, { DEFAULT_COLLECTION_NAME, COLLECTION_DRAG_TYPE } from './TagCollectionListItem';
import { ClientTagCollection, ROOT_TAG_COLLECTION_ID } from '../../entities/TagCollection';
import TagCollectionStore from '../stores/TagCollectionStore';
import { ID } from '../../entities/ID';
import IconSet from './Icons';
import { useDrop } from 'react-dnd/lib/cjs/hooks';

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
  const { uiStore } = store.rootStore;

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
        const newCol = await store.addTagCollection(DEFAULT_COLLECTION_NAME, col);
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
      onMoveUp={() => {
        // Move collection one position up
        const movedCollectionParent = store.tagCollectionList.find((c) => c.subCollections.includes(col.id));
        if (movedCollectionParent) {
          const oldIndex = movedCollectionParent.subCollections.indexOf(col.id);
          movedCollectionParent.subCollections.remove(col.id);
          movedCollectionParent.subCollections.splice(Math.max(0, oldIndex - 1), 0, col.id);
        }
      }}
      onMoveDown={() => {
        // Move collection one position down
        const movedCollectionParent = store.tagCollectionList.find((c) => c.subCollections.includes(col.id));
        if (movedCollectionParent) {
          const oldIndex = movedCollectionParent.subCollections.indexOf(col.id);
          movedCollectionParent.subCollections.remove(col.id);
          movedCollectionParent.subCollections.splice(
            Math.min(movedCollectionParent.subCollections.length, oldIndex + 1), 0, col.id);
        }
      }}
      onMoveTag={(id) => {
        const movedCollectionParent = store.tagCollectionList.find((c) => c.tags.includes(id));
        if (movedCollectionParent) {

          // instead of moving only this tag, we can move all selected tags (or collections)
          // Done for dragging tag into collection.
          // TODO: for dragging to other position
          // TODO: for dragging collection(s)
          // Todo: Disable select on rmb, only highlight it - keep the original selection (?)

          uiStore.tagSelection.forEach((t) => {
            const tag = store.rootStore.tagStore.tagList.find((cTag) => cTag.id === t);
            if (tag) {
              tag.parent.removeTag(t);
              col.addTag(t);
            }
          });
        }
      }}
      onAddSelectionToQuery={store.rootStore.uiStore.addTagSelectionToQuery}
      onReplaceQuery={store.rootStore.uiStore.replaceQueryWithSelection}
    />
  );

  const childNodes = [
    ...col.clientSubCollections.map(
      (subCol) => createTagCollectionTreeNode(subCol, expandState, store, setExpandState)),
    ...col.clientTags.map((tag): ITreeNode => ({
      id: tag.id,
      icon: IconSet.TAG,
      isSelected: uiStore.tagSelection.includes(tag.id),
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
          onAddSelectionToQuery={uiStore.addTagSelectionToQuery}
          onReplaceQuery={uiStore.replaceQueryWithSelection}
          isSelected={uiStore.tagSelection.includes(tag.id)}
          onSelect={(_, clear) => uiStore.selectTag(tag, clear)}
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
  const [expandState, setExpandState] = useState<IExpandState>({});

  // Auto expand collection if there is only one child of the root collection
  useEffect(() => {
    if (tagCollectionStore.getRootCollection().subCollections.length === 1) {
      setExpandState({ [tagCollectionStore.getRootCollection().subCollections[0]]: true });
    }
  }, []);

  const handleRootAddTag = useCallback(() => {
    tagStore.addTag(DEFAULT_TAG_NAME)
      .then((tag) => tagCollectionStore.getRootCollection().addTag(tag.id))
      .catch((err) => console.log('Could not create tag', err));
  }, []);
  const handleAddRootCollection = useCallback(async () => {
    await tagCollectionStore.addTagCollection(DEFAULT_COLLECTION_NAME, tagCollectionStore.getRootCollection());
  }, []);

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

  // Moves a tag or collection to the root collection
  const moveToRoot = useCallback((id: ID, bottom?: boolean) => {
    // Check whether ID belongs to tag or collection
    const collection = tagCollectionStore.tagCollectionList.find((c) => c.id === id);
    const tag = tagStore.tagList.find((t) => t.id === id);
    if (collection) {
      const parent = tagCollectionStore.tagCollectionList.find((c) => c.subCollections.includes(id));
      if (parent) {
        parent.subCollections.remove(id);
        if (!bottom) {
          tagCollectionStore.getRootCollection().subCollections.splice(0, 0, id);
        } else {
          tagCollectionStore.getRootCollection().subCollections.push(id);
        }
      }
    } else if (tag) {
      const parent = tagCollectionStore.tagCollectionList.find((c) => c.tags.includes(id));
      if (parent) {
        parent.tags.remove(id);
        if (!bottom) {
          tagCollectionStore.getRootCollection().tags.splice(0, 0, id);
        } else {
          tagCollectionStore.getRootCollection().tags.push(id);
        }
      }
    }
  }, []);

  // Allow dropping tags on header and background to move them to the root of the hierarchy
  const [headerCollectedProps, headerDrop] = useDrop({
    accept: [TAG_DRAG_TYPE, COLLECTION_DRAG_TYPE],
    drop: ({ id }: any) => moveToRoot(id),
  });
  const [footerCollectedProps, footerDrop] = useDrop({
    accept: [TAG_DRAG_TYPE, COLLECTION_DRAG_TYPE],
    drop: ({ id }: any) => moveToRoot(id, true),
  });

  return (
    <>
      <div id="outliner-tags-header-wrapper" ref={headerDrop}>
        <H4 className="bp3-heading">Tags</H4>
        <Button minimal icon={IconSet.TAG_ADD} onClick={handleRootAddTag}/>
        <Button minimal icon={IconSet.COLLECTION_ADD} onClick={handleAddRootCollection} />
      </div>

      <Tree
        contents={(hierarchy[0].childNodes && hierarchy[0].childNodes.length > 0)
          ? hierarchy[0].childNodes
          : [{ label: <i>No tags or collections created yet</i>, id: 'placeholder' } as ITreeNode]}
        onNodeCollapse={handleNodeCollapse}
        onNodeExpand={handleNodeExpand}
        onNodeClick={handleNodeClick}
      // TODO: Context menu from here instead of in the TagCollectionListItem
      // Then you can right-click anywhere instead of only on the label
      // https://github.com/palantir/blueprint/issues/3187
        // onNodeContextMenu={handleNodeContextMenu}
      />

      <div id="tree-footer" ref={footerDrop} />

      <div id="system-tags">
        <ButtonGroup vertical minimal fill>
          <Button
            text="All images"
            icon={IconSet.MEDIA}
            rightIcon={uiStore.viewContent === 'all' ? <Icon intent="primary" icon="eye-open" /> : null}
            onClick={uiStore.viewContentAll}
            active={uiStore.viewContent === 'all'}
          />
          {/* <Button
            text="Searched images"
            icon={IconSet.SEARCH}
            rightIcon={uiStore.viewContent === 'query' ? <Icon intent="primary" icon="eye-open" /> : null}
            onClick={uiStore.viewContentQuery}
            active={uiStore.viewContent === 'query'}
          /> */}
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
