import React, { useMemo, useState, useCallback, useReducer } from 'react';
import { computed } from 'mobx';
import { observer } from 'mobx-react-lite';
import { ContextMenu, Collapse, Button, H4, Icon, InputGroup } from '@blueprintjs/core';

import { Tree } from 'components';
import IconSet from 'components/Icons';
import {
  ITreeBranch,
  ITreeLeaf,
  createBranchOnKeyDown,
  createLeafOnKeyDown,
} from 'components/Tree';
import { TagRemoval } from './MessageBox';
import {
  ClientIDSearchCriteria,
  ClientCollectionSearchCriteria,
} from 'src/renderer/entities/SearchCriteria';
import { ClientTagCollection, ROOT_TAG_COLLECTION_ID } from 'src/renderer/entities/TagCollection';
import { ClientTag } from 'src/renderer/entities/Tag';
import { ID } from 'src/renderer/entities/ID';
import UiStore, { FileSearchCriteria } from 'src/renderer/frontend/UiStore';
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

/** Map that keeps track of the IDs that are expanded */
export type IExpansionState = { [key: string]: boolean };

export const enum ActionType {
  InsertNode,
  SetEditableNode,
  SetExpansion,
  ToggleExpansion,
  OpenExpansion,
}

type State = { expansion: IExpansionState; editableNode: ID | undefined };

export type Action =
  | { type: ActionType.InsertNode; payload: { parent: ID; node: ID } }
  | { type: ActionType.SetEditableNode; payload: ID | undefined }
  | { type: ActionType.SetExpansion; payload: IExpansionState }
  | { type: ActionType.ToggleExpansion | ActionType.OpenExpansion; payload: ID };

const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case ActionType.InsertNode:
      return {
        expansion: state.expansion[action.payload.parent]
          ? state.expansion
          : { ...state.expansion, [action.payload.parent]: true },
        editableNode: action.payload.node,
      };

    case ActionType.SetEditableNode:
      return {
        ...state,
        editableNode: action.payload,
      };

    case ActionType.SetExpansion:
      return {
        ...state,
        expansion: { ...action.payload },
      };

    case ActionType.ToggleExpansion:
      return {
        ...state,
        expansion: { ...state.expansion, [action.payload]: !state.expansion[action.payload] },
      };

    case ActionType.OpenExpansion:
      return {
        ...state,
        expansion: { ...state.expansion, [action.payload]: true },
      };

    default:
      return state;
  }
};

interface ITreeData {
  state: State;
  dispatch: React.Dispatch<Action>;
  submit: (target: EventTarget & HTMLInputElement) => void;
  select: (event: React.MouseEvent, nodeData: ClientTagCollection | ClientTag) => void;
  uiStore: UiStore;
}

interface ILabelProps {
  /** SVG element */
  icon: JSX.Element;
  text: string;
  setText: (value: string) => void;
  isEditing: boolean;
  color: string;
  onSubmit: (target: EventTarget & HTMLInputElement) => void;
}

// const isValid = (text: string) => text.trim().length > 0;

const Label = observer((props: ILabelProps) => {
  return (
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
            }
            props.onSubmit(e.currentTarget);
          }}
          onFocus={(e) => e.target.select()}
          // Only show red outline when input field is in focus and text is invalid
          // TODO: Visualizing errors...
          // className={!isValidInput ? 'bp3-intent-danger' : ''}
        />
      ) : (
        <div>{props.text}</div>
      )}
    </>
  );
});

interface ITagProps {
  nodeData: ClientTag;
  uiStore: UiStore;
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
  const { nodeData, uiStore, dispatch, isEditing, submit, pos, select } = props;
  const handleContextMenu = useCallback(
    (e) =>
      ContextMenu.show(
        <TagContextMenu
          dispatch={dispatch}
          color={nodeData.color}
          id={nodeData.id}
          isSelected={nodeData.isSelected}
          uiStore={uiStore}
        />,
        { left: e.clientX, top: e.clientY },
      ),
    [dispatch, nodeData.color, nodeData.id, nodeData.isSelected, uiStore],
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
      if (event.dataTransfer.types.includes(DnDType.Tag)) {
        event.dataTransfer.dropEffect = 'none';
        const id = event.dataTransfer.getData(DnDType.Tag);
        const tag = uiStore.rootStore.tagStore.get(id);
        if (tag) {
          const index = pos - nodeData.parent.subCollections.length - 1; // 'pos' does not start from 0!
          nodeData.parent.insertTag(tag, index);
        }
        const dataSet = event.currentTarget.dataset;
        delete dataSet[DnDAttribute.Target];
      }
    },
    [nodeData.parent, pos, uiStore.rootStore.tagStore],
  );

  const handleClick = useCallback(
    (event: React.MouseEvent<HTMLDivElement, MouseEvent>) => select(event, nodeData),
    [nodeData, select],
  );

  const handleQuickQuery = useCallback(() => toggleQuery(nodeData, uiStore), [nodeData, uiStore]);

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
      onClick={handleClick}
    >
      <Label
        text={nodeData.name}
        setText={nodeData.rename}
        color={nodeData.color}
        icon={IconSet.TAG}
        isEditing={isEditing}
        onSubmit={submit}
      />
      <span
        onClick={handleQuickQuery}
        className={`after-icon ${nodeData.isSearched ? 'searched' : ''}`}
      ></span>
    </div>
  );
});

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
    uiStore={treeData.uiStore}
    pos={pos}
    select={treeData.select}
  />
);

interface ICollectionProps extends Omit<ITagProps, 'nodeData'> {
  nodeData: ClientTagCollection;
  expansion: IExpansionState;
}

const Collection = observer((props: ICollectionProps) => {
  const { nodeData, dispatch, expansion, isEditing, submit, pos, uiStore, select } = props;

  const handleContextMenu = useCallback(
    (e) =>
      ContextMenu.show(
        <CollectionContextMenu
          dispatch={dispatch}
          expansion={expansion}
          nodeData={nodeData}
          pos={pos}
          uiStore={uiStore}
        />,
        { left: e.clientX, top: e.clientY },
      ),
    [dispatch, expansion, nodeData, pos, uiStore],
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
            return (
              !uiStore.rootStore.tagCollectionStore
                .get(DragItem.id)
                ?.containsSubCollection(nodeData.id) || false
            );
          }
          return true;
        },
        'move',
        () => dispatch({ type: ActionType.OpenExpansion, payload: nodeData.id }),
      ),
    [dispatch, nodeData.id, nodeData.isSelected, uiStore.rootStore.tagCollectionStore],
  );

  const handleDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      if (DragItem.isSelected) {
        uiStore.moveSelectedTagItems(nodeData.id);
        return;
      }
      if (event.dataTransfer.types.includes(DnDType.Tag)) {
        event.dataTransfer.dropEffect = 'none';
        const data = event.dataTransfer.getData(DnDType.Tag);
        const tag = uiStore.rootStore.tagStore.get(data);
        if (tag) {
          nodeData.insertTag(tag);
        }
        delete event.currentTarget.dataset[DnDAttribute.Target];
      } else if (event.dataTransfer.types.includes(DnDType.Collection)) {
        event.dataTransfer.dropEffect = 'none';
        const data = event.dataTransfer.getData(DnDType.Collection);
        const collection = uiStore.rootStore.tagCollectionStore.get(data);
        if (collection && !nodeData.containsSubCollection(collection.id)) {
          nodeData.insertCollection(collection);
        }
        delete event.currentTarget.dataset[DnDAttribute.Target];
      }
    },
    [nodeData, uiStore],
  );

  const handleClick = useCallback(
    (event: React.MouseEvent<HTMLDivElement, MouseEvent>) => select(event, nodeData),
    [nodeData, select],
  );

  const handleQuickQuery = useCallback(() => toggleQuery(nodeData, uiStore), [nodeData, uiStore]);

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
      onClick={handleClick}
    >
      <Label
        text={nodeData.name}
        setText={nodeData.rename}
        color={nodeData.color}
        icon={expansion[nodeData.id] ? IconSet.TAG_GROUP_OPEN : IconSet.TAG_GROUP}
        isEditing={isEditing}
        onSubmit={submit}
      />
      <span
        onClick={handleQuickQuery}
        className={`after-icon ${nodeData.isSearched ? 'searched' : ''}`}
      ></span>
    </div>
  );
});

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
    uiStore={treeData.uiStore}
    select={treeData.select}
  />
);

const isSelected = (nodeData: ClientTag | ClientTagCollection): boolean => nodeData.isSelected;

const isExpanded = (nodeData: ClientTagCollection, treeData: ITreeData): boolean =>
  treeData.state.expansion[nodeData.id];

const toggleExpansion = (nodeData: ClientTagCollection, treeData: ITreeData) =>
  treeData.dispatch({ type: ActionType.ToggleExpansion, payload: nodeData.id });

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
      treeData.dispatch({ type: ActionType.SetEditableNode, payload: nodeData.id });
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
      treeData.uiStore.openOutlinerTagRemover(nodeData.isSelected ? 'selected' : nodeData.id);
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
    console.log(node.name);
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
  };
};

interface ITagsTreeProps {
  root: ClientTagCollection;
  uiStore: UiStore;
}

const TagsTree = observer(({ root, uiStore }: ITagsTreeProps) => {
  const { tagStore, tagCollectionStore } = uiStore.rootStore;

  const [state, dispatch] = useReducer(reducer, { expansion: {}, editableNode: undefined });

  const submit = useCallback((target: EventTarget & HTMLInputElement) => {
    target.focus();
    dispatch({ type: ActionType.SetEditableNode, payload: undefined });
    target.setSelectionRange(0, 0);
  }, []);

  // Handles selection via click event
  const [lastSelection, setLastSelection] = useState<ID | undefined>(undefined);
  const select = useCallback(
    (event: React.MouseEvent, nodeData: ClientTagCollection | ClientTag) => {
      if (event.shiftKey && lastSelection !== undefined && lastSelection !== nodeData.id) {
        setLastSelection(rangeSelection(nodeData, lastSelection, root, uiStore));
      } else if (event.ctrlKey || event.metaKey) {
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
      } else {
        // Replaces whole selection
        nodeData instanceof ClientTag
          ? uiStore.selectTag(nodeData, true)
          : uiStore.selectTags(nodeData.getTagsRecursively(), true);
        setLastSelection(nodeData.id);
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
  const toggleCollapse = () => setIsCollapsed(!isCollapsed);

  const handleRootAddTag = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      tagStore
        .addTag('New Tag')
        .then((tag) => {
          root.addTag(tag.id);
          dispatch({ type: ActionType.SetEditableNode, payload: tag.id });
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
          dispatch({ type: ActionType.SetEditableNode, payload: col.id });
        })
        .catch((err) => console.log('Could not create collection', err));
    },
    [root, tagCollectionStore],
  );

  const handleDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      if (DragItem.isSelected) {
        uiStore.moveSelectedTagItems(ROOT_TAG_COLLECTION_ID);
        return;
      }
      if (event.dataTransfer.types.includes(DnDType.Tag)) {
        event.dataTransfer.dropEffect = 'none';
        const data = event.dataTransfer.getData(DnDType.Tag);
        const tag = tagStore.get(data);
        if (tag) {
          root.insertTag(tag);
        }
        delete event.currentTarget.dataset[DnDAttribute.Target];
      } else if (event.dataTransfer.types.includes(DnDType.Collection)) {
        event.dataTransfer.dropEffect = 'none';
        const data = event.dataTransfer.getData(DnDType.Collection);
        const collection = tagCollectionStore.get(data);
        if (collection) {
          root.insertCollection(collection);
        }
        delete event.currentTarget.dataset[DnDAttribute.Target];
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
        onClick={toggleCollapse}
        onDragOver={handleDragOverAndLeave}
        onDragLeave={handleDragOverAndLeave}
        onDrop={handleDrop}
      >
        <H4 className="bp3-heading">
          <Icon icon={isCollapsed ? IconSet.ARROW_RIGHT : IconSet.ARROW_DOWN} />
          Tags
        </H4>
        <Button
          minimal
          icon={IconSet.TAG_ADD}
          onClick={handleRootAddTag}
          className="tooltip"
          data-right="New Tag"
        />
        <Button
          minimal
          icon={IconSet.TAG_ADD_COLLECTION}
          onClick={handleAddRootCollection}
          className="tooltip"
          data-right="New Collection"
        />
      </div>

      <Collapse isOpen={!isCollapsed}>
        <Tree
          multiSelect
          branches={branches.get()}
          leaves={leaves.get()}
          treeData={treeData}
          toggleExpansion={toggleExpansion}
          onBranchKeyDown={handleBranchOnKeyDown}
          onLeafKeyDown={handleLeafOnKeyDown}
        />
      </Collapse>

      {/* Used for dragging collection to root of hierarchy and for deselecting tag selection */}
      <div
        id="tree-footer"
        onClick={uiStore.clearTagSelection}
        onDragOver={handleDragOverAndLeave}
        onDragLeave={handleDragOverAndLeave}
        onDrop={handleDrop}
      />

      <TagRemoval rootStore={uiStore.rootStore} />
    </>
  );
});

export default TagsTree;
