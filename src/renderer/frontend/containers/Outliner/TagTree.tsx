import React, { useMemo, useState, useCallback, useReducer } from 'react';
import { observer } from 'mobx-react-lite';

import { TreeView, TextInput } from 'components';
import { ClientTagCollection } from '../../../entities/TagCollection';
import {
  ITreeBranch,
  ITreeLeaf,
  createBranchOnKeyDown,
  createLeafOnKeyDown,
} from 'components/TreeView';
import { ClientTag } from '../../../entities/Tag';
import UiStore from '../../UiStore';
import { ID } from 'src/renderer/entities/ID';
import {
  ContextMenu,
  Menu,
  MenuItem,
  Divider,
  Collapse,
  Button,
  H4,
  Icon,
} from '@blueprintjs/core';
import IconSet from 'components/Icons';
import { ColorPickerMenu } from './TagPanel/TagTree';
import { ClientIDSearchCriteria } from '../../../entities/SearchCriteria';
import { formatTagCountText } from '../../utils';
import { TagRemoval } from './TagPanel/MessageBox';

/** Map that keeps track of the IDs that are expanded */
type IExpansionState = { [key: string]: boolean };

const enum ActionType {
  InsertNode,
  SetEditableNode,
  SetExpansion,
  ToggleExpansion,
}

type State = { expansion: IExpansionState; editableNode: ID | undefined };

type Action =
  | { type: ActionType.InsertNode; payload: { parent: ID; node: ID } }
  | { type: ActionType.SetEditableNode; payload: ID | undefined }
  | { type: ActionType.SetExpansion; payload: IExpansionState }
  | { type: ActionType.ToggleExpansion; payload: ID };

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

    default:
      return state;
  }
};

interface ITagTreeData {
  state: State;
  dispatch: React.Dispatch<Action>;
  uiStore: UiStore;
}

const expandSubCollection = (
  c: ClientTagCollection,
  expansion: IExpansionState,
): IExpansionState => {
  c.clientSubCollections.forEach((subCol) => {
    expandSubCollection(subCol, expansion);
  });
  expansion[c.id] = true;
  return expansion;
};

const collapseSubCollection = (
  c: ClientTagCollection,
  expansion: IExpansionState,
): IExpansionState => {
  c.clientSubCollections.forEach((subCol) => {
    collapseSubCollection(subCol, expansion);
  });
  expansion[c.id] = false;
  return expansion;
};

interface ILabelProps {
  /** SVG element */
  icon: JSX.Element;
  text: string;
  setText: (value: string) => void;
  isEditing: boolean;
  color: string;
  onSubmit: (target: EventTarget & HTMLInputElement) => void;
  onContextMenu?: (event: React.MouseEvent<HTMLInputElement, MouseEvent>) => void;
}

const isValid = (text: string) => text.trim().length > 0;

const Label = (props: ILabelProps) => {
  return (
    <>
      <div style={{ color: props.color }}>{props.icon}</div>
      <TextInput
        autoFocus
        placeholder="Enter a new name"
        readOnly={!props.isEditing}
        // So, the ugly truth is that this input wouldn't update properly and
        // would require another additional text state but since the names will
        // only ever be changed using this component, I couldn't care less. If
        // you find yourself wondering why the tag names aren't properly
        // updating, then you found it right here in black and white or whatever
        // syntax highlighting you have enabled.
        defaultValue={props.text}
        setText={props.setText}
        isValid={isValid}
        onSubmit={props.onSubmit}
        onContextMenu={props.onContextMenu}
      />
    </>
  );
};

interface ITagProps {
  nodeData: ClientTag;
  uiStore: UiStore;
  dispatch: React.Dispatch<Action>;
  isEditing: boolean;
}

interface ITagMenuProps extends Omit<ITagProps, 'nodeData' | 'isEditing'> {
  id: ID;
  color: string;
  isSelected: boolean;
}

const TagContextMenu = ({ id, color, isSelected, uiStore, dispatch }: ITagMenuProps) => {
  const { tags, collections } = uiStore.getTagContextItems(id);
  let contextText = formatTagCountText(Math.max(0, tags.length - 1), collections.length);
  contextText = contextText && ` (${contextText})`;

  return (
    <Menu>
      <MenuItem
        onClick={() => dispatch({ type: ActionType.SetEditableNode, payload: id })}
        text="Rename"
        icon={IconSet.EDIT}
      />
      <MenuItem
        onClick={() => uiStore.openOutlinerTagRemover(isSelected ? 'selected' : id)}
        text={`Delete${contextText}`}
        icon={IconSet.DELETE}
      />
      <ColorPickerMenu
        selectedColor={color}
        onChange={(color) => uiStore.colorSelectedTagsAndCollections(id, color)}
        contextText={contextText}
      />
      <Divider />
      <MenuItem
        onClick={() =>
          isSelected
            ? uiStore.replaceCriteriaWithTagSelection()
            : uiStore.addSearchCriteria(new ClientIDSearchCriteria('tags', id))
        }
        text="Add to Search Query"
        icon={IconSet.SEARCH}
      />
      <MenuItem
        onClick={() =>
          isSelected
            ? uiStore.replaceCriteriaWithTagSelection()
            : uiStore.replaceSearchCriteria(new ClientIDSearchCriteria('tags', id))
        }
        text="Replace Search Query"
        icon={IconSet.REPLACE}
      />
    </Menu>
  );
};

const Tag = observer(({ nodeData, uiStore, dispatch, isEditing }: ITagProps) => {
  const onSubmit = useCallback(
    (target: EventTarget & HTMLInputElement) => {
      target.focus();
      dispatch({ type: ActionType.SetEditableNode, payload: undefined });
    },
    [dispatch],
  );

  const onContextMenu = useCallback(
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

  return (
    <Label
      text={nodeData.name}
      setText={nodeData.rename}
      color={nodeData.color}
      icon={IconSet.TAG}
      isEditing={isEditing}
      onSubmit={onSubmit}
      onContextMenu={onContextMenu}
    />
  );
});

const TagLabel = (nodeData: ClientTag, treeData: ITagTreeData) => (
  <Tag
    nodeData={nodeData}
    dispatch={treeData.dispatch}
    isEditing={treeData.state.editableNode === nodeData.id}
    uiStore={treeData.uiStore}
  />
);

interface ICollectionProps extends Omit<ITagProps, 'nodeData'> {
  nodeData: ClientTagCollection;
  expansion: IExpansionState;
  pos: number;
}

type ICollectionMenuProps = Omit<ICollectionProps, 'isEditing'>;

const CollectionContextMenu = (props: ICollectionMenuProps) => {
  const { nodeData, dispatch, expansion, pos, uiStore } = props;
  const { tags, collections } = uiStore.getTagContextItems(nodeData.id);
  const { tagStore, tagCollectionStore } = uiStore.rootStore;
  let contextText = formatTagCountText(tags.length, Math.max(0, collections.length - 1));
  contextText = contextText && ` (${contextText})`;
  return (
    <Menu>
      <MenuItem
        onClick={() =>
          tagStore
            .addTag('New Tag')
            .then((tag) => {
              nodeData.addTag(tag.id);
              dispatch({
                type: ActionType.InsertNode,
                payload: { parent: nodeData.id, node: tag.id },
              });
            })
            .catch((err) => console.log('Could not create tag', err))
        }
        text="New Tag"
        icon={IconSet.TAG_ADD}
      />
      <MenuItem
        onClick={() =>
          tagCollectionStore
            .addTagCollection('New Collection', nodeData)
            .then((collection) => {
              nodeData.addCollection(collection.id);
              dispatch({
                type: ActionType.InsertNode,
                payload: { parent: nodeData.id, node: collection.id },
              });
            })
            .catch((err) => console.log('Could not create collection', err))
        }
        text="New Collection"
        icon={IconSet.TAG_ADD_COLLECTION}
      />
      <MenuItem
        onClick={() => dispatch({ type: ActionType.SetEditableNode, payload: nodeData.id })}
        text="Rename"
        icon={IconSet.EDIT}
      />
      <MenuItem
        onClick={() =>
          uiStore.openOutlinerTagRemover(nodeData.isSelected ? 'selected' : nodeData.id)
        }
        text={`Delete${contextText}`}
        icon={IconSet.DELETE}
      />
      <ColorPickerMenu
        selectedColor={nodeData.color}
        onChange={(color) => uiStore.colorSelectedTagsAndCollections(nodeData.id, color)}
        contextText={contextText}
      />
      <Divider />
      <MenuItem
        onClick={() =>
          dispatch({
            type: ActionType.SetExpansion,
            payload: expandSubCollection(nodeData, expansion),
          })
        }
        text="Expand"
        icon={IconSet.ITEM_EXPAND}
      />
      <MenuItem
        onClick={() =>
          dispatch({
            type: ActionType.SetExpansion,
            payload: collapseSubCollection(nodeData, expansion),
          })
        }
        text="Collapse"
        icon={IconSet.ITEM_COLLAPS}
      />
      <MenuItem
        onClick={() => nodeData.parent.insertCollection(nodeData, pos - 2)}
        text="Move Up"
        icon={IconSet.ITEM_MOVE_UP}
        disabled={pos === 1}
      />
      <MenuItem
        onClick={() => nodeData.parent.insertCollection(nodeData, pos + 1)}
        text="Move Down"
        icon={IconSet.ITEM_MOVE_DOWN}
        disabled={pos === nodeData.parent.subCollections.length}
      />
      <Divider />
      <MenuItem
        onClick={() =>
          nodeData.isSelected
            ? uiStore.replaceCriteriaWithTagSelection()
            : uiStore.addSearchCriterias(
                nodeData.getTagsRecursively().map((c: ID) => new ClientIDSearchCriteria('tags', c)),
              )
        }
        text="Add to Search Query"
        icon={IconSet.SEARCH}
      />
      <MenuItem
        onClick={() =>
          nodeData.isSelected
            ? uiStore.replaceCriteriaWithTagSelection()
            : uiStore.replaceSearchCriterias(
                nodeData.getTagsRecursively().map((c: ID) => new ClientIDSearchCriteria('tags', c)),
              )
        }
        text="Replace Search Query"
        icon={IconSet.REPLACE}
      />
    </Menu>
  );
};

const Collection = observer((props: ICollectionProps) => {
  const { nodeData, dispatch, expansion, isEditing, pos, uiStore } = props;
  const onSubmit = useCallback(
    (target: EventTarget & HTMLInputElement) => {
      target.focus();
      dispatch({ type: ActionType.SetEditableNode, payload: undefined });
      target.setSelectionRange(0, 0);
    },
    [dispatch],
  );

  const onContextMenu = useCallback(
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

  return (
    <Label
      text={nodeData.name}
      setText={nodeData.rename}
      color={nodeData.color}
      icon={expansion[nodeData.id] ? IconSet.TAG_GROUP_OPEN : IconSet.TAG_GROUP}
      isEditing={isEditing}
      onSubmit={onSubmit}
      onContextMenu={onContextMenu}
    />
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

const isSelected = (_id: string, nodeData: ClientTag | ClientTagCollection): boolean =>
  nodeData.isSelected;

const isExpanded = (_id: string, nodeData: ClientTagCollection, treeData: ITagTreeData): boolean =>
  treeData.state.expansion[nodeData.id];

const toggleExpansion = (_id: string, nodeData: ClientTagCollection, treeData: ITagTreeData) =>
  treeData.dispatch({ type: ActionType.ToggleExpansion, payload: nodeData.id });

// TODO: Split
const toggleSelection = (
  id: string,
  nodeData: ClientTag | ClientTagCollection,
  { uiStore }: ITagTreeData,
) => {
  if (nodeData instanceof ClientTag) {
    nodeData.isSelected ? uiStore.deselectTag(id) : uiStore.selectTag(nodeData);
  } else {
    nodeData.isSelected
      ? uiStore.deselectTags(nodeData.getTagsRecursively())
      : uiStore.selectTags(nodeData.getTagsRecursively());
  }
};

const customKeys = (
  event: React.KeyboardEvent<HTMLLIElement>,
  _id: ID,
  nodeData: any,
  treeData: ITagTreeData,
) => {
  if (event.key === 'F2') {
    event.stopPropagation();
    treeData.dispatch({ type: ActionType.SetEditableNode, payload: nodeData.id });
  } else if (event.shiftKey && event.key === 'F10') {
    const input = event.currentTarget.querySelector('input');
    if (input) {
      // TODO: Auto-focus the context menu! Do this in the onContextMenu handler.
      event.stopPropagation();
      input.dispatchEvent(
        new MouseEvent('contextmenu', {
          clientX: input.getBoundingClientRect().right,
          clientY: input.getBoundingClientRect().top,
        }),
      );
    }
  }
};

const handleBranchOnKeyDown = (
  event: React.KeyboardEvent<HTMLLIElement>,
  id: string,
  nodeData: ClientTagCollection,
  treeData: ITagTreeData,
) =>
  createBranchOnKeyDown(
    event,
    id,
    nodeData,
    treeData,
    isExpanded,
    toggleSelection,
    toggleExpansion,
    customKeys,
  );

const handleLeafOnKeyDown = (
  event: React.KeyboardEvent<HTMLLIElement>,
  id: string,
  nodeData: ClientTag,
  treeData: ITagTreeData,
) =>
  createLeafOnKeyDown(event, id, nodeData, treeData, (_id, nodeData, { uiStore }) =>
    nodeData.isSelected ? uiStore.deselectTag(id) : uiStore.selectTag(nodeData),
  );

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

interface ITagTree {
  root: ClientTagCollection;
  uiStore: UiStore;
}

const TagTree = observer(({ root, uiStore }: ITagTree) => {
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
        .addTagCollection('New Collection', root)
        .then((col) => dispatch({ type: ActionType.SetEditableNode, payload: col.id }))
        .catch((err) => console.log('Could not create collection', err));
    },
    [root, tagCollectionStore],
  );

  const leaves = useMemo(() => root.clientTags.map(mapLeaf), [root.clientTags]);
  const branches = useMemo(() => root.clientSubCollections.map(mapCollection), [
    root.clientSubCollections,
  ]);

  return (
    <>
      <div className="outliner-header-wrapper" onClick={toggleCollapse}>
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
          branches={branches}
          leaves={leaves}
          treeData={treeData}
          toggleExpansion={toggleExpansion}
          onBranchKeyDown={handleBranchOnKeyDown}
          onLeafKeyDown={handleLeafOnKeyDown}
        />
      </Collapse>

      {/* Used for dragging collection to root of hierarchy and for deselecting tag selection
      <div id="tree-footer" ref={footerDrop} onClick={uiStore.clearTagSelection} /> */}

      <TagRemoval rootStore={uiStore.rootStore} />
    </>
  );
});

export default TagTree;
