import React, { useMemo, useState, useCallback, useReducer } from 'react';
import { computed } from 'mobx';
import { observer } from 'mobx-react-lite';
import { ContextMenu, Collapse, Button, H4, Icon } from '@blueprintjs/core';

import { TreeView, TextInput } from 'components';
import IconSet from 'components/Icons';
import {
  ITreeBranch,
  ITreeLeaf,
  createBranchOnKeyDown,
  createLeafOnKeyDown,
} from 'components/TreeView';
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

interface ITagTreeData {
  state: State;
  dispatch: React.Dispatch<Action>;
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

const isValid = (text: string) => text.trim().length > 0;

const Label = (props: ILabelProps) => {
  return (
    <>
      <span className="pre-icon" style={{ color: props.color }}>
        {props.icon}
      </span>
      {props.isEditing ? (
        <TextInput
          autoFocus
          placeholder="Enter a new name"
          defaultValue={props.text}
          setText={props.setText}
          isValid={isValid}
          onSubmit={props.onSubmit}
        />
      ) : (
        <div>{props.text}</div>
      )}
    </>
  );
};

interface ITagProps {
  nodeData: ClientTag;
  uiStore: UiStore;
  dispatch: React.Dispatch<Action>;
  isEditing: boolean;
  pos: number;
}

/**
 * Toggles Query
 *
 * All it does is remove the query if it already searched, otherwise adds a
 * query. Handling filter mode or replacing the search criteria list is up to
 * the component.
 */
const toggleQuery = (
  nodeData: ClientTagCollection | ClientTag,
  isSearched: boolean,
  uiStore: UiStore,
) => {
  if (isSearched) {
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

const Tag = observer(({ nodeData, uiStore, dispatch, isEditing, pos }: ITagProps) => {

  const handleSubmit = useCallback(
    (target: EventTarget & HTMLInputElement) => {
      target.focus();
      dispatch({ type: ActionType.SetEditableNode, payload: undefined });
    },
    [dispatch],
  );

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
    (event: React.DragEvent<HTMLDivElement>) =>
      onDragStart(event, nodeData.name, DnDType.Tag, nodeData.id, nodeData.isSelected, 'linkMove'),
    [nodeData.id, nodeData.isSelected, nodeData.name],
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
    (event: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
      if (event.ctrlKey) {
        nodeData.isSelected ? uiStore.deselectTag(nodeData.id) : uiStore.selectTag(nodeData);
      } else {
        uiStore.selectTag(nodeData, true);
      }
    },
    [nodeData, uiStore],
  );

  const handleQuickQuery = useCallback(() => {
    toggleQuery(nodeData, nodeData.isSearched, uiStore);
  }, [nodeData, uiStore]);

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
        onSubmit={handleSubmit}
      />
      <span onClick={handleQuickQuery} className={`after-icon ${nodeData.isSearched && 'searched'}`}></span>
    </div>
  );
});

const TagLabel = (
  nodeData: ClientTag,
  treeData: ITagTreeData,
  _level: number,
  _size: number,
  pos: number,
) => (
  <Tag
    nodeData={nodeData}
    dispatch={treeData.dispatch}
    isEditing={treeData.state.editableNode === nodeData.id}
    uiStore={treeData.uiStore}
    pos={pos}
  />
);

interface ICollectionProps extends Omit<ITagProps, 'nodeData'> {
  nodeData: ClientTagCollection;
  expansion: IExpansionState;
}

const Collection = observer((props: ICollectionProps) => {
  const { nodeData, dispatch, expansion, isEditing, pos, uiStore } = props;

  const isSearched = nodeData.isSearched;

  const handleSubmit = useCallback(
    (target: EventTarget & HTMLInputElement) => {
      target.focus();
      dispatch({ type: ActionType.SetEditableNode, payload: undefined });
      target.setSelectionRange(0, 0);
    },
    [dispatch],
  );

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
    (event: React.DragEvent<HTMLDivElement>) =>
      onDragStart(event, nodeData.name, DnDType.Collection, nodeData.id, nodeData.isSelected),
    [nodeData.id, nodeData.isSelected, nodeData.name],
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
    (event: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
      const tags = nodeData.getTagsRecursively();
      if (event.ctrlKey) {
        nodeData.isSelected ? uiStore.deselectTags(tags) : uiStore.selectTags(tags);
      } else {
        uiStore.selectTags(tags, true);
      }
    },
    [nodeData, uiStore],
  );

  const handleQuickQuery = useCallback(() => {
    toggleQuery(nodeData, isSearched, uiStore);
  }, [isSearched, nodeData, uiStore]);

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
        onSubmit={handleSubmit}
      />
      <span onClick={handleQuickQuery} className={`after-icon ${isSearched && 'searched'}`}></span>
    </div>
  );
});

const CollectionLabel = (
  nodeData: ClientTagCollection,
  treeData: ITagTreeData,
  _level: number,
  _size: number,
  pos: number,
) => (
  <Collection
    nodeData={nodeData}
    dispatch={treeData.dispatch}
    expansion={treeData.state.expansion}
    isEditing={treeData.state.editableNode === nodeData.id}
    pos={pos}
    uiStore={treeData.uiStore}
  />
);

const isSelected = (nodeData: ClientTag | ClientTagCollection): boolean => nodeData.isSelected;

const isExpanded = (nodeData: ClientTagCollection, treeData: ITagTreeData): boolean =>
  treeData.state.expansion[nodeData.id];

const toggleExpansion = (nodeData: ClientTagCollection, treeData: ITagTreeData) =>
  treeData.dispatch({ type: ActionType.ToggleExpansion, payload: nodeData.id });

const toggleSelection = (nodeData: ClientTag | ClientTagCollection, { uiStore }: ITagTreeData) => {
  if (nodeData instanceof ClientTag) {
    nodeData.isSelected ? uiStore.deselectTag(nodeData.id) : uiStore.selectTag(nodeData);
  } else {
    nodeData.isSelected
      ? uiStore.deselectTags(nodeData.getTagsRecursively())
      : uiStore.selectTags(nodeData.getTagsRecursively());
  }
};

const customKeys = (
  event: React.KeyboardEvent<HTMLLIElement>,
  nodeData: any,
  treeData: ITagTreeData,
) => {
  if (event.key === 'F2') { // Rename with F2
    event.stopPropagation();
    treeData.dispatch({ type: ActionType.SetEditableNode, payload: nodeData.id });
  } else if (event.shiftKey && event.key === 'F10') { // Context menu with F10
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
  }
};

const handleBranchOnKeyDown = (
  event: React.KeyboardEvent<HTMLLIElement>,
  nodeData: ClientTagCollection,
  treeData: ITagTreeData,
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
  treeData: ITagTreeData,
) => createLeafOnKeyDown(event, nodeData, treeData, toggleSelection, customKeys);

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
  const treeData = useMemo(() => {
    return { state, dispatch, uiStore };
  }, [state, uiStore]);

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
        <TreeView
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
