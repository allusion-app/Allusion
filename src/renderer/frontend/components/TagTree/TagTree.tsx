import { observer, useComputed } from 'mobx-react-lite';
import React, { useState, useCallback, useEffect, useContext, useRef } from 'react';
import {
  Tree,
  ITreeNode,
  Button,
  Icon,
  ButtonGroup,
  H4,
  Alert,
  Classes,
  Tag,
  Hotkey,
  Hotkeys,
  HotkeysTarget,
} from '@blueprintjs/core';
import { useDrop } from 'react-dnd';

import TagListItem from './TagListItem';
import StoreContext, { IRootStoreProp } from '../../contexts/StoreContext';
import TagCollectionListItem from './TagCollectionListItem';
import { ClientTagCollection, ROOT_TAG_COLLECTION_ID } from '../../../entities/TagCollection';
import TagCollectionStore from '../../stores/TagCollectionStore';
import { ID } from '../../../entities/ID';
import IconSet from '../Icons';
import { ClientTag } from '../../../entities/Tag';
import { ItemType, ITagDragItem } from '../DragAndDrop';
import { DEFAULT_TAG_NAME, DEFAULT_COLLECTION_NAME } from '.';

interface IExpandState {
  [key: string]: boolean;
}

/** Recursive function that sets the 'expand' state for each (sub) collection */
const setExpandStateRecursively = (
  col: ClientTagCollection,
  val: boolean,
  expandState: IExpandState,
): IExpandState => {
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

  const movePosition = (position: (index: number, parent: ClientTagCollection) => number) => {
    const movedCollectionParent = store.tagCollectionList.find((c) =>
      c.subCollections.includes(col.id),
    );
    if (movedCollectionParent) {
      const oldIndex = movedCollectionParent.subCollections.indexOf(col.id);
      movedCollectionParent.subCollections.remove(col.id);
      const newIndex = position(oldIndex, movedCollectionParent);
      movedCollectionParent.subCollections.splice(newIndex, 0, col.id);
    }
  };

  const label = (
    <TagCollectionListItem
      tagCollection={col}
      onRemove={() =>
        store.rootStore.uiStore.openOutlinerTagRemover(col.isSelected ? 'selected' : col.id)
      }
      onAddTag={() => {
        store.rootStore.tagStore
          .addTag(DEFAULT_TAG_NAME)
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
      onCollapseAll={() =>
        setExpandState({ ...setExpandStateRecursively(col, false, expandState) })
      }
      // Move collection one position up
      onMoveUp={() => movePosition((pos) => Math.max(0, pos - 1))}
      // Move collection one position down
      onMoveDown={() =>
        movePosition((pos, parent) => Math.min(parent.subCollections.length, pos + 1))
      }
      onMoveCollection={(item) =>
        item.isSelected
          ? uiStore.moveSelectedTagItems(col.id)
          : uiStore.moveCollection(item.id, col)
      }
      onMoveTag={(item) =>
        item.isSelected ? uiStore.moveSelectedTagItems(col.id) : uiStore.moveTag(item.id, col)
      }
      onAddSelectionToQuery={() =>
        uiStore.addTagsToQuery(
          col.isSelected ? uiStore.tagSelection.toJS() : col.getTagsRecursively(),
        )
      }
      onReplaceQuery={() =>
        store.rootStore.uiStore.replaceQuery(
          col.isSelected ? uiStore.tagSelection.toJS() : col.getTagsRecursively(),
        )
      }
      onSelect={(_, clear) => uiStore.selectTags(col.getTagsRecursively(), clear)}
      rootStore={store.rootStore}
    />
  );

  const childNodes = [
    ...col.clientSubCollections.map((subCol) =>
      createTagCollectionTreeNode(subCol, expandState, store, setExpandState),
    ),
    ...col.clientTags.map(
      (tag): ITreeNode => ({
        id: tag.id,
        icon: IconSet.TAG,
        isSelected: uiStore.tagSelection.includes(tag.id),
        label: (
          <TagListItem
            name={tag.name}
            id={tag.id}
            dateAdded={tag.dateAdded}
            onRemove={() =>
              store.rootStore.uiStore.openOutlinerTagRemover(tag.isSelected ? 'selected' : tag.id)
            }
            onRename={(name) => (tag.name = name)}
            onMoveTag={(item) =>
              item.isSelected ? uiStore.moveSelectedTagItems(col.id) : uiStore.moveTag(item.id, col)
            }
            onAddSelectionToQuery={() =>
              uiStore.addTagsToQuery(tag.isSelected ? uiStore.tagSelection.toJS() : [tag.id])
            }
            onReplaceQuery={() =>
              uiStore.replaceQuery(tag.isSelected ? uiStore.tagSelection.toJS() : [tag.id])
            }
            isSelected={uiStore.tagSelection.includes(tag.id)}
            onSelect={(_, clear) => uiStore.selectTag(tag, clear)}
            rootStore={store.rootStore}
          />
        ),
      }),
    ),
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

const TagRemoverContent = ({ rootStore }: IRootStoreProp) => {
  const { uiStore, tagStore, tagCollectionStore } = rootStore;
  const [removeType, setRemoveType] = useState<ItemType.Tag | ItemType.Collection>();
  const [tagsToRemove, setTagsToRemove] = useState<ClientTag[]>([]);
  const [colToRemove, setColToRemove] = useState<ClientTagCollection>();

  useEffect(() => {
    // Check whether to remove selected tags or a specific tag or collection
    if (uiStore.isOutlinerTagRemoverOpen === 'selected') {
      setRemoveType(ItemType.Tag);
      setTagsToRemove(uiStore.clientTagSelection);
    } else if (uiStore.isOutlinerTagRemoverOpen) {
      const id = uiStore.isOutlinerTagRemoverOpen;
      const remTag = tagStore.getTag(id);
      if (remTag) {
        setRemoveType(ItemType.Tag);
        setTagsToRemove([remTag]);
      } else {
        const remCol = tagCollectionStore.getTagCollection(id);
        if (remCol) {
          setRemoveType(ItemType.Collection);
          setColToRemove(remCol);
          setTagsToRemove(remCol.getTagsRecursively().map((t) => tagStore.getTag(t) as ClientTag));
        }
      }
    }
  }, []);

  const tagsToRemoveOverview = (
    <div id="tag-remove-overview">
      {tagsToRemove.map((tag) => (
        <span key={tag.id}>
          <Tag intent="primary">{tag.name}</Tag>{' '}
        </span>
      ))}
    </div>
  );

  if (removeType === ItemType.Tag) {
    return (
      <>
        <h4 className="bp3-heading inpectorHeading">Confirm delete</h4>
        <p>
          Are you sure you want to permanently delete{' '}
          {tagsToRemove.length > 0 ? 'these tags' : 'this tag'}?
        </p>
        {tagsToRemoveOverview}
      </>
    );
  } else if (removeType === ItemType.Collection && colToRemove) {
    return (
      <>
        <h4 className="bp3-heading inpectorHeading">Confirm delete</h4>
        <p>
          Are you sure you want to permanently delete the collection '{colToRemove.name}'?
          <br />
          {tagsToRemove.length > 0 && 'It contains these tags:'}
        </p>
        {tagsToRemoveOverview}
      </>
    );
  }
  return <span>...</span>;
};

const TagRemover = observer(() => {
  const rootStore = useContext(StoreContext);
  const { uiStore, tagStore, tagCollectionStore } = rootStore;

  const handleConfirm = useCallback(
    async () => {
      if (uiStore.isOutlinerTagRemoverOpen === 'selected') {
        await uiStore.removeSelectedTagsAndCollections();
      } else if (uiStore.isOutlinerTagRemoverOpen) {
        const id = uiStore.isOutlinerTagRemoverOpen;
        const remTag = tagStore.getTag(id);
        if (remTag) {
          await tagStore.removeTag(remTag);
        } else {
          const remCol = tagCollectionStore.getTagCollection(id);
          if (remCol) {
            await tagCollectionStore.removeTagCollection(remCol);
          }
        }
      }
      uiStore.closeOutlinerTagRemover();
    },
    [uiStore.isOutlinerTagRemoverOpen],
  );

  return (
    <Alert
      isOpen={uiStore.isOutlinerTagRemoverOpen !== null}
      cancelButtonText="Cancel"
      confirmButtonText="Delete"
      icon={IconSet.DELETE}
      intent="danger"
      onCancel={uiStore.closeOutlinerTagRemover}
      canEscapeKeyCancel
      canOutsideClickCancel
      onConfirm={handleConfirm}
      className={Classes.DARK}
    >
      <TagRemoverContent rootStore={rootStore} />
    </Alert>
  );
});

export interface ITagListProps {}

const TagList = ({
  rootStore: { tagStore, tagCollectionStore, uiStore, fileStore },
}: ITagListProps & IRootStoreProp) => {
  /** The first item that is selected in a multi-selection */
  const initialSelectionIndex = useRef<number | undefined>(undefined);
  /** The last item that is selected in a multi-selection */
  const lastSelectionIndex = useRef<number | undefined>(undefined);
  // Keep track of folders that have been expanded. The two main folders are expanded by default.
  const [expandState, setExpandState] = useState<IExpandState>({});

  // Auto expand collection if there is only one child of the root collection
  useEffect(() => {
    if (tagCollectionStore.getRootCollection().subCollections.length === 1) {
      setExpandState({ [tagCollectionStore.getRootCollection().subCollections[0]]: true });
    }
  }, []);

  const handleRootAddTag = useCallback(() => {
    tagStore
      .addTag(DEFAULT_TAG_NAME)
      .then((tag) => tagCollectionStore.getRootCollection().addTag(tag.id))
      .catch((err) => console.log('Could not create tag', err));
  }, []);

  const handleAddRootCollection = useCallback(
    async () => {
      const newCol = await tagCollectionStore.addTagCollection(
        DEFAULT_COLLECTION_NAME,
        tagCollectionStore.getRootCollection(),
      );
      setExpandState({ ...expandState, [newCol.id]: true }); // immediately expand after adding
    },
    [expandState],
  );

  const handleNodeCollapse = useCallback(
    (node: ITreeNode) => setExpandState({ ...expandState, [node.id]: false }),
    [expandState],
  );

  const handleNodeExpand = useCallback(
    (node: ITreeNode) => setExpandState({ ...expandState, [node.id]: true }),
    [expandState],
  );

  const root = tagCollectionStore.getRootCollection();
  // Todo: Not sure what the impact is of generating the hierarchy in each render on performance.
  // Usually the hierarchy is stored directly in the state, but we can't do that since it it managed by the TagCollectionStore.
  // Or maybe we can, but then the ClientTagCollection needs to extends ITreeNode, which messes up the responsibility of the Store and the state required by the view...
  const hierarchy: ITreeNode[] = useComputed(
    () =>
      root
        ? [createTagCollectionTreeNode(root, expandState, tagCollectionStore, setExpandState)]
        : [],
    [root, expandState],
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

      const flattenHierarchy = (node: ITreeNode): ITreeNode[] => {
        return node.childNodes ? [node, ...node.childNodes.flatMap(flattenHierarchy)] : [node];
      };

      const flatHierarchy = flattenHierarchy(hierarchy[0]);
      const i = flatHierarchy.findIndex((item) => item.id === id);

      // Based on the event options, add or subtract the clickSelection from the global tag selection
      if (e.shiftKey && initialSelectionIndex.current !== undefined) {
        // Shift selection: Select from the initial up to the current index
        // Make sure that sliceStart is the lowest index of the two and vice versa
        let sliceStart = initialSelectionIndex.current;
        let sliceEnd = i;
        if (sliceEnd < sliceStart) {
          sliceStart = i;
          sliceEnd = initialSelectionIndex.current;
        }
        const idsToSelect = flatHierarchy
          .slice(sliceStart, sliceEnd + 1)
          .filter((item) => !item.hasCaret) // only collections have a caret
          .map((item) => item.id);
        // If the first/last item that was selected was a collection, also add that the tags of that collection
        [sliceStart, sliceEnd].map((index) => {
          if (flatHierarchy[index].hasCaret) {
            const selCol = tagCollectionStore.tagCollectionList.find(
              (col) => col.id === flatHierarchy[index].id,
            );
            if (selCol) {
              selCol
                .getTagsRecursively()
                .forEach((tagId) => idsToSelect.indexOf(tagId) === -1 && idsToSelect.push(tagId));
            }
          }
        });
        uiStore.selectTags(idsToSelect as ID[], true);
      } else if (e.ctrlKey || e.metaKey) {
        initialSelectionIndex.current = i;
        isClickSelectionSelected
          ? uiStore.deselectTags(clickSelection)
          : uiStore.selectTags(clickSelection);
      } else {
        // Normal click: If it was the only one that was selected, deselect it
        const isOnlySelected =
          isClickSelectionSelected && uiStore.tagSelection.length === clickSelection.length;

        initialSelectionIndex.current = i;

        if (!isOnlySelected) {
          uiStore.selectTags(clickSelection, true);
        } else {
          uiStore.deselectTags(clickSelection);
        }
      }
      lastSelectionIndex.current = i;
    },
    [hierarchy],
  );

  const handleRootDrop = useCallback((monitor) => {
    const item: ITagDragItem = monitor.getItem();
    if (item.isSelected) {
      return uiStore.moveSelectedTagItems(ROOT_TAG_COLLECTION_ID);
    }

    switch (monitor.getItemType()) {
      case ItemType.Tag:
        uiStore.moveTag(item.id, tagCollectionStore.getRootCollection());
        break;
      case ItemType.Collection:
        uiStore.moveCollection(item.id, tagCollectionStore.getRootCollection());
        break;
      default:
        break;
    }
  }, []);

  // Allow dropping tags on header and background to move them to the root of the hierarchy
  const [, headerDrop] = useDrop({
    accept: [ItemType.Tag, ItemType.Collection],
    drop: (_, monitor) => handleRootDrop(monitor),
  });

  const [, footerDrop] = useDrop({
    accept: [ItemType.Tag, ItemType.Collection],
    drop: (_, monitor) => handleRootDrop(monitor),
  });

  return (
    <>
      <div id="outliner-tags-header-wrapper" ref={headerDrop}>
        <H4 className="bp3-heading">Tags</H4>
        <Button
          minimal
          icon={IconSet.TAG_ADD}
          onClick={handleRootAddTag}
          className="tooltip"
          data-right={DEFAULT_TAG_NAME}
        />
        <Button
          minimal
          icon={IconSet.TAG_ADD_COLLECTION}
          onClick={handleAddRootCollection}
          className="tooltip"
          data-right={DEFAULT_COLLECTION_NAME}
        />
      </div>

      <Tree
        contents={
          hierarchy[0].childNodes && hierarchy[0].childNodes.length > 0
            ? hierarchy[0].childNodes
            : [{ label: <i>No tags or collections created yet</i>, id: 'placeholder' } as ITreeNode]
        }
        onNodeCollapse={handleNodeCollapse}
        onNodeExpand={handleNodeExpand}
        onNodeClick={handleNodeClick}
        // TODO: Context menu from here instead of in the TagCollectionListItem
        // Then you can right-click anywhere instead of only on the label
        // https://github.com/palantir/blueprint/issues/3187
        // onNodeContextMenu={handleNodeContextMenu}
      />

      {/* Used for dragging collection to root of hierarchy and for deselecting tag selection */}
      <div id="tree-footer" ref={footerDrop} onClick={uiStore.clearTagSelection} />

      <div className="bp3-divider" />

      <div id="system-tags">
        <ButtonGroup vertical minimal fill>
          <Button
            text="All images"
            icon={IconSet.MEDIA}
            rightIcon={
              uiStore.viewContent === 'all' ? (
                <Icon intent="primary" icon={IconSet.PREVIEW} />
              ) : null
            }
            onClick={uiStore.viewContentAll}
            active={uiStore.viewContent === 'all'}
            fill
          />
          <Button
            text={`Untagged (${fileStore.numUntaggedFiles})`}
            icon={IconSet.TAG_BLANCO}
            rightIcon={
              uiStore.viewContent === 'untagged' ? (
                <Icon icon={IconSet.PREVIEW} />
              ) : fileStore.numUntaggedFiles > 0 ? (
                <Icon icon={IconSet.WARNING} />
              ) : null
            }
            onClick={uiStore.viewContentUntagged}
            active={uiStore.viewContent === 'untagged'}
            fill
          />
        </ButtonGroup>
      </div>

      <TagRemover />
    </>
  );
};

const ObservingTagList = observer(TagList);

@HotkeysTarget
class TagListWithHotkeys extends React.PureComponent<ITagListProps & IRootStoreProp, {}> {
  render() {
    return (
      <div tabIndex={0}>
        <ObservingTagList {...this.props} />
      </div>
    );
  }
  selectAllTags = () => {
    this.props.rootStore.uiStore.selectTags(this.props.rootStore.tagStore.tagList.toJS());
  }
  openTagRemover = () => {
    this.props.rootStore.uiStore.openOutlinerTagRemover();
  }
  renderHotkeys() {
    const { uiStore } = this.props.rootStore;
    const { hotkeyMap } = uiStore;
    return (
      <Hotkeys>
        <Hotkey
          combo={hotkeyMap.selectAll}
          label="Select all tags in the outliner"
          onKeyDown={this.selectAllTags}
          group="Outliner"
        />
        <Hotkey
          combo={hotkeyMap.deselectAll}
          label="Deselect all tags in the outliner"
          onKeyDown={uiStore.clearTagSelection}
          group="Outliner"
        />
        <Hotkey
          combo={hotkeyMap.deleteSelection}
          label="Delete the selected tags and collections"
          onKeyDown={this.openTagRemover}
          group="Outliner"
        />
      </Hotkeys>
    );
  }
}

export const HotkeysWrapper = observer((props: ITagListProps) => {
  const rootStore = React.useContext(StoreContext);
  return <TagListWithHotkeys {...props} rootStore={rootStore} />;
});
