import { observer, useComputed } from 'mobx-react-lite';
import React, { useState, useCallback, useEffect, useContext } from 'react';

import TagListItem, { DEFAULT_TAG_NAME, TAG_DRAG_TYPE, ITagDragItem } from './TagListItem';

import StoreContext, { withRootstore, IRootStoreProp } from '../contexts/StoreContext';
import { Tree, ITreeNode, Button, Icon, ButtonGroup, H4, Alert, Classes, Tag } from '@blueprintjs/core';
import TagCollectionListItem, { DEFAULT_COLLECTION_NAME, COLLECTION_DRAG_TYPE } from './TagCollectionListItem';
import { ClientTagCollection, ROOT_TAG_COLLECTION_ID } from '../../entities/TagCollection';
import TagCollectionStore from '../stores/TagCollectionStore';
import { ID } from '../../entities/ID';
import IconSet from './Icons';
import { useDrop } from 'react-dnd/lib/cjs/hooks';
import { ClientTag } from '../../entities/Tag';
import RootStore from '../stores/RootStore';

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
      onRemove={() => store.rootStore.uiStore.openOutlinerTagRemover(col.isSelected ? 'selected' : col.id)}
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
      onMoveCollection={({ id, isSelected }) => isSelected
        ? uiStore.moveSelectedTagsAndCollections(col.id)
        : uiStore.moveCollection(id, col)}
      onMoveTag={({ id, isSelected }) => isSelected
        ? uiStore.moveSelectedTagsAndCollections(col.id)
        : uiStore.moveTag(id, col)}
      onAddSelectionToQuery={() => uiStore.addTagsToQuery(
        col.isSelected ? uiStore.tagSelection.toJS() : col.getTagsRecursively())}
      onReplaceQuery={() => store.rootStore.uiStore.replaceQuery(
        col.isSelected ? uiStore.tagSelection.toJS() : col.getTagsRecursively())}
      onSelect={(_, clear) => uiStore.selectTags(col.getTagsRecursively(), clear)}
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
          onRemove={() => store.rootStore.uiStore.openOutlinerTagRemover(tag.isSelected ? 'selected' : tag.id)}
          onRename={(name) => { tag.name = name; }}
          onMoveTag={({ id, isSelected }) => isSelected
            ? uiStore.moveSelectedTagsAndCollections(tag.id)
            : uiStore.moveTag(id, tag)}
          onAddSelectionToQuery={() => uiStore.addTagsToQuery(tag.isSelected ? uiStore.tagSelection.toJS() : [tag.id])}
          onReplaceQuery={() => uiStore.replaceQuery(tag.isSelected ? uiStore.tagSelection.toJS() : [tag.id])}
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

const TagRemoverContent = ({ rootStore }: { rootStore: RootStore }) => {
  const { uiStore, tagStore, tagCollectionStore } = rootStore;
  const [removeType, setRemoveType] = useState<'tag' | 'collection'>();
  const [tagsToRemove, setTagsToRemove] = useState<ClientTag[]>([]);
  const [colToRemove, setColToRemove] = useState<ClientTagCollection>();

  useEffect(() => {
    // Check whether to remove selected tags or a specific tag or collection
    if (uiStore.isOutlinerTagRemoverOpen === 'selected') {
      setRemoveType('tag');
      setTagsToRemove(uiStore.clientTagSelection);
    } else if (uiStore.isOutlinerTagRemoverOpen) {
      const id = uiStore.isOutlinerTagRemoverOpen;
      const remTag = tagStore.tagList.find((t) => t.id === id);
      if (remTag) {
        setRemoveType('tag');
        setTagsToRemove([remTag]);
      } else {
        const remCol = remTag ? undefined : tagCollectionStore.tagCollectionList.find((c) => c.id === id);
        if (remCol) {
          setRemoveType('collection');
          setColToRemove(remCol);
          setTagsToRemove(remCol.getTagsRecursively()
            .map((tId) => tagStore.tagList.find((t) => t.id === tId) as ClientTag));
        }
      }
    }
  }, []);

  const tagsToRemoveOverview = (
    <div id="tag-remove-overview">
      {tagsToRemove.map((tag) => (
        <span key={tag.id}>
          <Tag intent="primary">{tag.name}</Tag>
          {' '}
        </span>
      ))}
    </div>
  );

  if (removeType === 'tag') {
    return (<>
      <p>Are you sure you want to permanently delete {tagsToRemove.length > 0 ? 'these tags' : 'this tag'}?</p>
      {tagsToRemoveOverview}
    </>);
  } else if (removeType === 'collection' && colToRemove) {
    return (<>
      <p>
        Are you sure you want to permanently delete the collection '{colToRemove.name}'?
        <br />
        {tagsToRemove.length > 0 && 'It contains these tags:'}
      </p>
      {tagsToRemoveOverview}
    </>);
  }
  return <span>...</span>;
};

const TagRemover = observer(() => {
  const rootStore = useContext(StoreContext);
  const { uiStore, tagStore, tagCollectionStore } = rootStore;

  const handleConfirm = useCallback(async () => {
    if (uiStore.isOutlinerTagRemoverOpen === 'selected') {
      await uiStore.removeSelectedTagsAndCollections();
    } else if (uiStore.isOutlinerTagRemoverOpen) {
      const id = uiStore.isOutlinerTagRemoverOpen;
      const remTag = tagStore.tagList.find((t) => t.id === id);
      if (remTag) {
        await tagStore.removeTag(remTag);
      } else {
        const remCol = remTag ? undefined : tagCollectionStore.tagCollectionList.find((c) => c.id === id);
        if (remCol) {
          await tagCollectionStore.removeTagCollection(remCol);
        }
      }
    }
    uiStore.closeOutlinerTagRemover();
  }, [uiStore.isOutlinerTagRemoverOpen]);

  return (
    <Alert
      isOpen={uiStore.isOutlinerTagRemoverOpen !== null}
      cancelButtonText="Cancel"
      confirmButtonText="Delete"
      icon="trash"
      intent="danger"
      onCancel={uiStore.closeOutlinerTagRemover}
      // Todo: remove selection only when rmb on selection
      onConfirm={handleConfirm}
      className={Classes.DARK}
    >
      <TagRemoverContent rootStore={rootStore} />
    </Alert>
  );
});

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
    const newCol = await tagCollectionStore.addTagCollection(
      DEFAULT_COLLECTION_NAME,
      tagCollectionStore.getRootCollection());
    setExpandState({ ...expandState, [newCol.id]: true }); // immediately expand after adding
  }, [expandState]);

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
        isClickSelectionSelected = clickedTag.isSelected;
      }

      // When clicking on a collection
      const clickedCollection = tagCollectionStore.tagCollectionList.find((c) => c.id === id);
      if (clickedCollection) {
        // Get all tags recursively that are in this collection
        clickSelection.push(...clickedCollection.getTagsRecursively());

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
        } else {
          uiStore.deselectTags(clickSelection);
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

  const handleRootDrop = useCallback(({ id, isSelected }: ITagDragItem, mon, insertAtStart?: boolean) => {
    if (isSelected) {
      uiStore.moveSelectedTagsAndCollections(ROOT_TAG_COLLECTION_ID, insertAtStart);
    } else {
      (mon.getItemType() === TAG_DRAG_TYPE)
        ? uiStore.moveTag(id, tagCollectionStore.getRootCollection(), insertAtStart)
        : uiStore.moveCollection(id, tagCollectionStore.getRootCollection(), insertAtStart);
    }
  }, []);

  // Allow dropping tags on header and background to move them to the root of the hierarchy
  const [, headerDrop] = useDrop({
    accept: [TAG_DRAG_TYPE, COLLECTION_DRAG_TYPE],
    drop: (item: ITagDragItem, mon) => handleRootDrop(item, mon, true),
  });
  const [, footerDrop] = useDrop({
    accept: [TAG_DRAG_TYPE, COLLECTION_DRAG_TYPE],
    drop: handleRootDrop,
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

      {/* Used for dragging collection to root of hierarchy and flor deselecting tag selection */}
      <div id="tree-footer" ref={footerDrop} onClick={uiStore.clearTagSelection} />

      <div id="system-tags">
        <ButtonGroup vertical minimal fill>
          <Button
            text="All images"
            icon={IconSet.MEDIA}
            rightIcon={uiStore.viewContent === 'all' ? <Icon intent="primary" icon="eye-open" /> : null}
            onClick={uiStore.viewContentAll}
            active={uiStore.viewContent === 'all'}
            fill
          />
          <Button
            text={`Untagged (${fileStore.numUntaggedFiles})`}
            icon={IconSet.TAG_BLANCO}
            rightIcon={
              uiStore.viewContent === 'untagged'
                ? <Icon icon="eye-open" />
                : (fileStore.numUntaggedFiles > 0
                  ? <Icon icon={IconSet.WARNING} />
                  : null
                )
            }
            onClick={uiStore.viewContentUntagged}
            active={uiStore.viewContent === 'untagged'}
            // Doesnt fit the design, an icon i enough
            intent={fileStore.numUntaggedFiles > 0 ? 'none' : 'none'}
            fill
          />
        </ButtonGroup>
      </div>

      <TagRemover />
    </>
  );
};

export default withRootstore(observer(TagList));
