import React, { useMemo, useState, useCallback, useReducer, useContext } from 'react';
import { computed } from 'mobx';
import { observer } from 'mobx-react-lite';
import { ContextMenu, Collapse, H4, Icon, InputGroup } from '@blueprintjs/core';

import { Tree, Toolbar, ToolbarButton } from 'components';
import IconSet from 'components/Icons';
import {
  ITreeBranch,
  ITreeLeaf,
  createBranchOnKeyDown,
  createLeafOnKeyDown,
} from 'components/Tree';
import { TagRemoval } from '../MessageBox';
import {
  ClientIDSearchCriteria,
  ClientCollectionSearchCriteria,
} from 'src/renderer/entities/SearchCriteria';
import { ClientTagCollection, ROOT_TAG_COLLECTION_ID } from 'src/renderer/entities/TagCollection';
import { ClientTag } from 'src/renderer/entities/Tag';
import { ID } from 'src/renderer/entities/ID';
import UiStore, { FileSearchCriteria } from 'src/renderer/frontend/stores/UiStore';
import { TagContextMenu, CollectionContextMenu } from './ContextMenu';
import {
  DnDType,
  onDragOver,
  onDragStart,
  handleCollectionDragLeave,
  handleTagDragLeave,
  handleDragEnd,
  DnDAttribute,
  DragItem,
  handleDragOverAndLeave,
} from './DnD';
import { formatTagCountText } from 'src/renderer/frontend/utils';
import { IExpansionState } from '..';
import { Action, State, Factory, reducer } from './StateReducer';
import TagStore from 'src/renderer/frontend/stores/TagStore';
import TagCollectionStore from 'src/renderer/frontend/stores/TagCollectionStore';
import StoreContext from 'src/renderer/frontend/contexts/StoreContext';

interface ILabelProps {
  /** SVG element */
  icon: JSX.Element;
  text: string;
  setText: (value: string) => void;
  isEditing: boolean;
  color: string;
  onSubmit: (target: EventTarget & HTMLInputElement) => void;
  onClick: (event: React.MouseEvent) => void;
}

// const isValid = (text: string) => text.trim().length > 0;

const Label = (props: ILabelProps) => (
  <>
    <span className="pre-icon" style={{ color: props.color }}>
      {props.icon}
    </span>
    {props.isEditing ? (
      <InputGroup
        autoFocus
        placeholder="Enter a new name"
        defaultValue={props.text}
        onBlur={(e) => {
          const value = e.currentTarget.value.trim();
          if (value.length > 0) {
            props.setText(value);
          }
          props.onSubmit(e.currentTarget);
        }}
        onKeyDown={(e) => {
          const value = e.currentTarget.value.trim();
          if (e.key === 'Enter' && value.length > 0) {
            props.setText(value);
            props.onSubmit(e.currentTarget);
          }
        }}
        onFocus={(e) => e.target.select()}
        // TODO: Visualizing errors...
        // Only show red outline when input field is in focus and text is invalid
        // className={!isValidInput ? 'bp3-intent-danger' : ''}
      />
    ) : (
      <div onClick={props.onClick}>{props.text}</div>
    )}
  </>
);

interface ITagProps {
  nodeData: ClientTag;
  dispatch: React.Dispatch<Action>;
  isEditing: boolean;
  submit: (target: EventTarget & HTMLInputElement) => void;
  select: (event: React.MouseEvent, nodeData: ClientTagCollection | ClientTag) => void;
  pos: number;
}

/**
 * Toggles Query
 *
 * All it does is remove the query if it already searched, otherwise adds a
 * query. Handling filter mode or replacing the search criteria list is up to
 * the component.
 */
const toggleQuery = (nodeData: ClientTagCollection | ClientTag, uiStore: UiStore) => {
  if (nodeData.isSearched) {
    // if it already exists, then remove it
    let alreadySearchedCrit: FileSearchCriteria | undefined;
    if (nodeData instanceof ClientTagCollection) {
      alreadySearchedCrit = uiStore.searchCriteriaList.find(
        (c) => (c as ClientCollectionSearchCriteria)?.collectionId === nodeData.id,
      );
    } else {
      alreadySearchedCrit = uiStore.searchCriteriaList.find((c) =>
        (c as ClientIDSearchCriteria<any>)?.value?.includes(nodeData.id),
      );
    }
    if (alreadySearchedCrit) {
      uiStore.replaceSearchCriterias(
        uiStore.searchCriteriaList.filter((c) => c !== alreadySearchedCrit),
      );
    }
  } else {
    if (nodeData instanceof ClientTagCollection) {
      uiStore.addSearchCriteria(
        new ClientCollectionSearchCriteria(
          nodeData.id,
          nodeData.getTagsRecursively(),
          nodeData.name,
        ),
      );
    } else {
      uiStore.addSearchCriteria(new ClientIDSearchCriteria('tags', nodeData.id));
    }
  }
};

const Tag = observer((props: ITagProps) => {
  const { nodeData, dispatch, isEditing, submit, pos, select } = props;
  const { tagStore, uiStore } = useContext(StoreContext);

  const handleContextMenu = useCallback(
    (e) =>
      ContextMenu.show(
        <TagContextMenu dispatch={dispatch} nodeData={nodeData} uiStore={uiStore} />,
        {
          left: e.clientX,
          top: e.clientY,
        },
        undefined,
        uiStore.theme === 'DARK',
      ),
    [dispatch, nodeData, uiStore],
  );

  const handleDragStart = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      let name = nodeData.name;
      if (nodeData.isSelected) {
        const ctx = uiStore.getTagContextItems(nodeData.id);
        const extraText = formatTagCountText(ctx.tags.length - 1, ctx.collections.length);
        if (extraText.length > 0) {
          name = name + ` (${extraText})`;
        }
      }
      onDragStart(event, name, DnDType.Tag, nodeData.id, nodeData.isSelected, 'linkMove');
    },
    [nodeData.id, nodeData.isSelected, nodeData.name, uiStore],
  );

  const handleDragOver = useCallback(
    (event: React.DragEvent<HTMLDivElement>) =>
      onDragOver(event, nodeData.isSelected, (t) => t === DnDType.Tag),
    [nodeData.isSelected],
  );

  const handleDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      const dataSet = event.currentTarget.dataset;
      if (DragItem.isSelected) {
        uiStore.moveSelectedTagItems(nodeData.id);
        dataSet[DnDAttribute.Target] = 'false';
        event.currentTarget.classList.remove('top');
        event.currentTarget.classList.remove('bottom');
        return;
      }
      if (event.dataTransfer.types.includes(DnDType.Tag)) {
        event.dataTransfer.dropEffect = 'none';
        const id = event.dataTransfer.getData(DnDType.Tag);
        const tag = tagStore.get(id);
        if (tag) {
          let index = pos - nodeData.parent.subCollections.length - 1; // 'pos' does not start from 0!
          index = event.currentTarget.classList.contains('bottom') ? index + 1 : index;
          nodeData.parent.insertTag(tag, index);
        }
        dataSet[DnDAttribute.Target] = 'false';
        event.currentTarget.classList.remove('top');
        event.currentTarget.classList.remove('bottom');
      }
    },
    [nodeData.id, nodeData.parent, pos, tagStore, uiStore],
  );

  const handleSelect = useCallback((event: React.MouseEvent) => select(event, nodeData), [
    nodeData,
    select,
  ]);

  const handleQuickQuery = useCallback(
    (event: React.MouseEvent) => {
      const query = new ClientIDSearchCriteria('tags', nodeData.id);
      if (event.ctrlKey) {
        if (!nodeData.isSearched) {
          uiStore.addSearchCriteria(query);
        }
      } else {
        uiStore.replaceSearchCriteria(query);
      }
    },
    [nodeData, uiStore],
  );

  return (
    <div
      className="tree-content-label"
      draggable={!isEditing}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragLeave={handleTagDragLeave}
      onDrop={handleDrop}
      onDragEnd={handleDragEnd}
      onContextMenu={handleContextMenu}
    >
      <Label
        text={nodeData.name}
        setText={nodeData.rename}
        color={nodeData.viewColor}
        icon={IconSet.TAG}
        isEditing={isEditing}
        onSubmit={submit}
        onClick={handleQuickQuery}
      />
      {!isEditing && (
        <button onClick={handleSelect} className="after-icon">
          {nodeData.isSelected ? IconSet.CHECKMARK : IconSet.SELECT_ALL}
        </button>
      )}
    </div>
  );
});

interface ICollectionProps extends Omit<ITagProps, 'nodeData'> {
  nodeData: ClientTagCollection;
  expansion: IExpansionState;
}

const Collection = observer((props: ICollectionProps) => {
  const { nodeData, dispatch, expansion, isEditing, submit, pos, select } = props;
  const { tagCollectionStore, tagStore, uiStore } = useContext(StoreContext);

  const handleContextMenu = useCallback(
    (e) =>
      ContextMenu.show(
        <CollectionContextMenu
          dispatch={dispatch}
          expansion={expansion}
          nodeData={nodeData}
          pos={pos}
          tagCollectionStore={tagCollectionStore}
          tagStore={tagStore}
          uiStore={uiStore}
        />,
        { left: e.clientX, top: e.clientY },
        undefined,
        uiStore.theme === 'DARK',
      ),
    [dispatch, expansion, nodeData, pos, tagCollectionStore, tagStore, uiStore],
  );

  const handleDragStart = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      let name = nodeData.name;
      if (nodeData.isSelected) {
        const ctx = uiStore.getTagContextItems(nodeData.id);
        const extraText = formatTagCountText(ctx.tags.length, ctx.collections.length - 1);
        if (extraText.length > 0) {
          name = name + `(${extraText})`;
        }
      }
      onDragStart(event, name, DnDType.Collection, nodeData.id, nodeData.isSelected);
    },
    [nodeData.id, nodeData.isSelected, nodeData.name, uiStore],
  );

  const handleDragOver = useCallback(
    (event: React.DragEvent<HTMLDivElement>) =>
      onDragOver(
        event,
        nodeData.isSelected,
        (t) => t === DnDType.Tag || t === DnDType.Collection,
        (t) => {
          if (t === DnDType.Collection) {
            const draggedCollection = tagCollectionStore.get(DragItem.id);
            if (draggedCollection) {
              // An ancestor cannot be a descendant!
              return !draggedCollection.containsSubCollection(nodeData.id);
            }
            return false;
          }
          return true;
        },
        'move',
        () => {
          if (!expansion[nodeData.id]) {
            dispatch(Factory.expandNode(nodeData.id));
          }
        },
      ),
    [dispatch, expansion, nodeData.id, nodeData.isSelected, tagCollectionStore],
  );

  const handleDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      const dataSet = event.currentTarget.dataset;
      if (DragItem.isSelected) {
        uiStore.moveSelectedTagItems(nodeData.id);
        dataSet[DnDAttribute.Target] = 'false';
        event.currentTarget.classList.remove('top');
        event.currentTarget.classList.remove('bottom');
        return;
      }
      if (event.dataTransfer.types.includes(DnDType.Tag)) {
        event.dataTransfer.dropEffect = 'none';
        const id = event.dataTransfer.getData(DnDType.Tag);
        const tag = tagStore.get(id);
        if (tag) {
          nodeData.insertTag(tag);
        }
        dataSet[DnDAttribute.Target] = 'false';
        event.currentTarget.classList.remove('top');
        event.currentTarget.classList.remove('bottom');
      } else if (event.dataTransfer.types.includes(DnDType.Collection)) {
        event.dataTransfer.dropEffect = 'none';
        const id = event.dataTransfer.getData(DnDType.Collection);
        const collection = tagCollectionStore.get(id);
        if (collection && !collection.containsSubCollection(nodeData.id)) {
          if (event.currentTarget.classList.contains('top')) {
            nodeData.parent.insertCollection(collection, pos - 1); // 'pos' does not start from 0!
          } else if (event.currentTarget.classList.contains('bottom')) {
            nodeData.parent.insertCollection(collection, pos);
          } else {
            nodeData.insertCollection(collection);
          }
        }
        dataSet[DnDAttribute.Target] = 'false';
        event.currentTarget.classList.remove('top');
        event.currentTarget.classList.remove('bottom');
      }
    },
    [nodeData, pos, tagCollectionStore, tagStore, uiStore],
  );

  const handleSelect = useCallback((event: React.MouseEvent) => select(event, nodeData), [
    nodeData,
    select,
  ]);

  const handleQuickQuery = useCallback(
    (event: React.MouseEvent) => {
      const query = new ClientCollectionSearchCriteria(
        nodeData.id,
        nodeData.getTagsRecursively(),
        nodeData.name,
      );
      if (event.ctrlKey) {
        if (!nodeData.isSearched) {
          uiStore.addSearchCriteria(query);
        }
      } else {
        uiStore.replaceSearchCriteria(query);
      }
    },
    [nodeData, uiStore],
  );

  return (
    <div
      className="tree-content-label"
      draggable={!isEditing}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragLeave={handleCollectionDragLeave}
      onDragEnd={handleDragEnd}
      onDrop={handleDrop}
      onContextMenu={handleContextMenu}
    >
      <Label
        text={nodeData.name}
        setText={nodeData.rename}
        color={nodeData.viewColor}
        icon={expansion[nodeData.id] ? IconSet.TAG_GROUP_OPEN : IconSet.TAG_GROUP}
        isEditing={isEditing}
        onSubmit={submit}
        onClick={handleQuickQuery}
      />
      {!isEditing && (
        <button disabled={!nodeData.hasContent} onClick={handleSelect} className="after-icon">
          {nodeData.isSelected ? IconSet.CHECKMARK : IconSet.SELECT_ALL}
        </button>
      )}
    </div>
  );
});

interface ITreeData {
  state: State;
  dispatch: React.Dispatch<Action>;
  submit: (target: EventTarget & HTMLInputElement) => void;
  select: (event: React.MouseEvent, nodeData: ClientTagCollection | ClientTag) => void;
  uiStore: UiStore;
}

const TagLabel = (
  nodeData: ClientTag,
  treeData: ITreeData,
  _level: number,
  _size: number,
  pos: number,
) => (
  <Tag
    nodeData={nodeData}
    dispatch={treeData.dispatch}
    isEditing={treeData.state.editableNode === nodeData.id}
    submit={treeData.submit}
    pos={pos}
    select={treeData.select}
  />
);

const CollectionLabel = (
  nodeData: ClientTagCollection,
  treeData: ITreeData,
  _level: number,
  _size: number,
  pos: number,
) => (
  <Collection
    nodeData={nodeData}
    dispatch={treeData.dispatch}
    expansion={treeData.state.expansion}
    isEditing={treeData.state.editableNode === nodeData.id}
    submit={treeData.submit}
    pos={pos}
    select={treeData.select}
  />
);

const isSelected = (nodeData: ClientTag | ClientTagCollection): boolean => nodeData.isSelected;

const isExpanded = (nodeData: ClientTagCollection, treeData: ITreeData): boolean =>
  treeData.state.expansion[nodeData.id];

const toggleExpansion = (nodeData: ClientTagCollection, treeData: ITreeData) =>
  treeData.dispatch(Factory.toggleNode(nodeData.id));

const toggleSelection = (nodeData: ClientTag | ClientTagCollection, { uiStore }: ITreeData) => {
  if (nodeData instanceof ClientTag) {
    nodeData.isSelected ? uiStore.deselectTag(nodeData.id) : uiStore.selectTag(nodeData);
  } else {
    nodeData.isSelected
      ? uiStore.deselectTags(nodeData.getTagsRecursively())
      : uiStore.selectTags(nodeData.getTagsRecursively());
  }
};

const triggerContextMenuEvent = (event: React.KeyboardEvent<HTMLLIElement>) => {
  const element = event.currentTarget.querySelector('.tree-content-label');
  if (element) {
    // TODO: Auto-focus the context menu! Do this in the onContextMenu handler.
    // Why not trigger context menus through `ContextMenu.show()`?
    event.stopPropagation();
    element.dispatchEvent(
      new MouseEvent('contextmenu', {
        clientX: element.getBoundingClientRect().right,
        clientY: element.getBoundingClientRect().top,
      }),
    );
  }
};

const customKeys = (
  event: React.KeyboardEvent<HTMLLIElement>,
  nodeData: ClientTag | ClientTagCollection,
  treeData: ITreeData,
) => {
  switch (event.key) {
    case 'F2':
      event.stopPropagation();
      treeData.dispatch(Factory.enableEditing(nodeData.id));
      break;

    case 'F10':
      if (event.shiftKey) {
        triggerContextMenuEvent(event);
      }
      break;

    case 'Enter':
      event.stopPropagation();
      toggleQuery(nodeData, treeData.uiStore);
      break;

    case 'Delete':
      treeData.dispatch(Factory.confirmDeletion(nodeData));
      break;

    case 'ContextMenu':
      triggerContextMenuEvent(event);
      break;

    default:
      break;
  }
};

const handleBranchOnKeyDown = (
  event: React.KeyboardEvent<HTMLLIElement>,
  nodeData: ClientTagCollection,
  treeData: ITreeData,
) =>
  createBranchOnKeyDown(
    event,
    nodeData,
    treeData,
    isExpanded,
    toggleSelection,
    toggleExpansion,
    customKeys,
  );

const handleLeafOnKeyDown = (
  event: React.KeyboardEvent<HTMLLIElement>,
  nodeData: ClientTag,
  treeData: ITreeData,
) => createLeafOnKeyDown(event, nodeData, treeData, toggleSelection, customKeys);

// Range Selection from last selected node
const rangeSelection = (
  nodeData: ClientTagCollection | ClientTag,
  lastSelection: ID,
  root: ClientTagCollection,
  uiStore: UiStore,
): ID => {
  uiStore.clearTagSelection();
  let isSelecting: { value: boolean } | undefined = undefined;
  const selectRange = (node: ClientTagCollection | ClientTag) => {
    if (node.id === lastSelection || node.id === nodeData.id) {
      if (isSelecting === undefined) {
        isSelecting = { value: true };
      } else {
        node instanceof ClientTag
          ? uiStore.selectTag(node)
          : uiStore.selectTags(node.getTagsRecursively());
        isSelecting = { value: false };
        return nodeData.id;
      }
    }

    if (node instanceof ClientTagCollection) {
      // Pre-order Tree Traversal
      for (const collection of node.clientSubCollections) {
        if (isSelecting === undefined || isSelecting.value) {
          selectRange(collection);
          continue;
        }
        return nodeData.id;
      }
      for (const tag of node.clientTags) {
        if (isSelecting === undefined || isSelecting.value) {
          selectRange(tag);
          continue;
        }
        return nodeData.id;
      }
    } else if (isSelecting?.value) {
      uiStore.selectTag(node);
    }
  };
  selectRange(root);
  return nodeData.id;
};

const mapLeaf = (tag: ClientTag): ITreeLeaf => {
  return {
    id: tag.id,
    label: TagLabel,
    nodeData: tag,
    isSelected,
    className: tag.isSearched ? 'searched' : undefined,
  };
};

const mapCollection = (collection: ClientTagCollection): ITreeBranch => {
  return {
    id: collection.id,
    label: CollectionLabel,
    branches: collection.clientSubCollections.map(mapCollection),
    leaves: collection.clientTags.map(mapLeaf),
    nodeData: collection,
    isExpanded,
    isSelected,
    className: collection.isSearched ? 'searched' : undefined,
  };
};

interface ITagsTreeProps {
  root: ClientTagCollection;
  tagCollectionStore: TagCollectionStore;
  tagStore: TagStore;
  uiStore: UiStore;
}

const TagsTree = observer(({ root, tagCollectionStore, tagStore, uiStore }: ITagsTreeProps) => {
  const theme = uiStore.theme === 'DARK' ? 'bp3-dark' : 'bp3-light';

  const [state, dispatch] = useReducer(reducer, {
    expansion: {},
    editableNode: undefined,
    deletableNode: undefined,
  });

  const submit = useCallback((target: EventTarget & HTMLInputElement) => {
    target.focus();
    dispatch(Factory.disableEditing());
    target.setSelectionRange(0, 0);
  }, []);

  // Handles selection via click event
  const [lastSelection, setLastSelection] = useState<ID | undefined>(undefined);
  const select = useCallback(
    (event: React.MouseEvent, nodeData: ClientTagCollection | ClientTag) => {
      if (event.shiftKey && lastSelection !== undefined && lastSelection !== nodeData.id) {
        setLastSelection(rangeSelection(nodeData, lastSelection, root, uiStore));
      } else {
        // Toggles selection state of a single node
        const nextLastSelection = nodeData.isSelected ? undefined : nodeData.id;
        if (nodeData instanceof ClientTag) {
          nodeData.isSelected ? uiStore.deselectTag(nodeData.id) : uiStore.selectTag(nodeData);
        } else {
          nodeData.isSelected
            ? uiStore.deselectTags(nodeData.getTagsRecursively())
            : uiStore.selectTags(nodeData.getTagsRecursively());
        }
        setLastSelection(nextLastSelection);
      }
    },
    [lastSelection, root, uiStore],
  );

  const treeData: ITreeData = useMemo(
    () => ({
      state,
      dispatch,
      uiStore,
      submit,
      select,
    }),
    [select, state, submit, uiStore],
  );

  const [isCollapsed, setIsCollapsed] = useState(false);

  const handleRootAddTag = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      tagStore
        .addTag('New Tag')
        .then((tag) => {
          root.addTag(tag.id);
          dispatch(Factory.enableEditing(tag.id));
        })
        .catch((err) => console.log('Could not create tag', err));
    },
    [root, tagStore],
  );

  const handleAddRootCollection = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      tagCollectionStore
        .addTagCollection('New Collection')
        .then((col) => {
          root.addCollection(col.id);
          dispatch(Factory.enableEditing(col.id));
        })
        .catch((err) => console.log('Could not create collection', err));
    },
    [root, tagCollectionStore],
  );

  const handleDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      const dataSet = event.currentTarget.dataset;
      if (DragItem.isSelected) {
        uiStore.moveSelectedTagItems(ROOT_TAG_COLLECTION_ID);
        dataSet[DnDAttribute.Target] = 'false';
        return;
      }
      if (event.dataTransfer.types.includes(DnDType.Tag)) {
        event.dataTransfer.dropEffect = 'none';
        const data = event.dataTransfer.getData(DnDType.Tag);
        const tag = tagStore.get(data);
        if (tag) {
          root.insertTag(tag);
        }
        dataSet[DnDAttribute.Target] = 'false';
      } else if (event.dataTransfer.types.includes(DnDType.Collection)) {
        event.dataTransfer.dropEffect = 'none';
        const data = event.dataTransfer.getData(DnDType.Collection);
        const collection = tagCollectionStore.get(data);
        if (collection) {
          root.insertCollection(collection);
        }
        dataSet[DnDAttribute.Target] = 'false';
      }
    },
    [root, tagCollectionStore, tagStore, uiStore],
  );

  const leaves = computed(() => root.clientTags.map(mapLeaf));
  const branches = computed(() => root.clientSubCollections.map(mapCollection));

  return (
    <>
      <div
        className="outliner-header-wrapper"
        onDragOver={handleDragOverAndLeave}
        onDragLeave={handleDragOverAndLeave}
        onDrop={handleDrop}
      >
        <H4 className="bp3-heading" onClick={() => setIsCollapsed(!isCollapsed)}>
          <Icon icon={isCollapsed ? IconSet.ARROW_RIGHT : IconSet.ARROW_DOWN} />
          Tags
        </H4>
        <Toolbar controls="tag-hierarchy">
          {uiStore.tagSelection.size > 0 ? (
            <ToolbarButton
              showLabel="never"
              icon={IconSet.CLOSE}
              label="Clear"
              onClick={uiStore.clearTagSelection}
              tooltip="Clear Selection"
            />
          ) : (
            <>
              <ToolbarButton
                showLabel="never"
                icon={IconSet.TAG_ADD}
                label="New Tag"
                onClick={handleRootAddTag}
                tooltip="Add New Tag"
              />
              <ToolbarButton
                showLabel="never"
                icon={IconSet.TAG_ADD_COLLECTION}
                label="New Collection"
                onClick={handleAddRootCollection}
                tooltip="Add New Collection"
              />
            </>
          )}
        </Toolbar>
      </div>

      <Collapse isOpen={!isCollapsed}>
        {root.subCollections.length === 0 && root.tags.length === 0 ? (
          <div className="tree-content-label" style={{ padding: '0.25rem' }}>
            <span className="pre-icon">{IconSet.INFO}</span>
            No tags or collections created yet
          </div>
        ) : (
          <Tree
            multiSelect
            id="tag-hierarchy"
            className={uiStore.tagSelection.size > 0 ? 'selected' : undefined}
            branches={branches.get()}
            leaves={leaves.get()}
            treeData={treeData}
            toggleExpansion={toggleExpansion}
            onBranchKeyDown={handleBranchOnKeyDown}
            onLeafKeyDown={handleLeafOnKeyDown}
          />
        )}
      </Collapse>

      {/* Used for dragging collection to root of hierarchy and for deselecting tag selection */}
      <div
        id="tree-footer"
        onClick={uiStore.clearTagSelection}
        onDragOver={handleDragOverAndLeave}
        onDragLeave={handleDragOverAndLeave}
        onDrop={handleDrop}
      />

      {state.deletableNode && (
        <TagRemoval
          theme={theme}
          object={state.deletableNode}
          onClose={() => dispatch(Factory.abortDeletion())}
        />
      )}
    </>
  );
});

export default TagsTree;
