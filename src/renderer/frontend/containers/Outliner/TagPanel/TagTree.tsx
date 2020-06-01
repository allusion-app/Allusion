import React, { useMemo, useState, useCallback, useReducer } from 'react';
import { computed } from 'mobx';
import { observer } from 'mobx-react-lite';
import {
  ContextMenu,
  Menu,
  MenuItem,
  Divider,
  Collapse,
  Button,
  H4,
  Icon,
  Classes,
} from '@blueprintjs/core';
import { SketchPicker, ColorResult } from 'react-color';

import { TreeView, TextInput } from 'components';
import IconSet from 'components/Icons';
import {
  ITreeBranch,
  ITreeLeaf,
  createBranchOnKeyDown,
  createLeafOnKeyDown,
} from 'components/TreeView';
import { TagRemoval } from './MessageBox';
import { ClientIDSearchCriteria } from '../../../../entities/SearchCriteria';
import { ClientTagCollection, ROOT_TAG_COLLECTION_ID } from '../../../../entities/TagCollection';
import { ClientTag } from '../../../../entities/Tag';
import { ID } from 'src/renderer/entities/ID';
import UiStore from '../../../UiStore';
import { formatTagCountText } from '../../../utils';

interface IColorOptions {
  label: string;
  value: string;
}

const defaultColorOptions: IColorOptions[] = [
  { label: 'Default', value: '' },
  { label: 'Eminence', value: '#5f3292' },
  { label: 'Indigo', value: '#5642A6' },
  { label: 'Blue Ribbon', value: '#143ef1' },
  { label: 'Azure Radiance', value: '#147df1' },
  { label: 'Aquamarine', value: '#6cdfe3' },
  { label: 'Aero Blue', value: '#bdfce4' },
  { label: 'Golden Fizz', value: '#f7ea3a' },
  { label: 'Goldenrod', value: '#fcd870' },
  { label: 'Christineapprox', value: '#f36a0f' },
  { label: 'Crimson', value: '#ec1335' },
  { label: 'Razzmatazz', value: '#ec125f' },
];

interface IColorPickerMenuProps {
  selectedColor: string;
  onChange: (color: string) => any;
  contextText: string;
}

const ColorPickerMenu = observer(
  ({ selectedColor, onChange, contextText }: IColorPickerMenuProps) => {
    const defaultColor = '#007af5';
    const handlePickCustomColor = useCallback(
      (res: ColorResult) => {
        onChange(res.hex);
      },
      [onChange],
    );
    return (
      <MenuItem
        text={`Color${contextText}`}
        icon={<Icon icon={selectedColor ? IconSet.COLOR : IconSet.COLOR} color={selectedColor} />}
      >
        {defaultColorOptions.map(({ label, value }) => (
          <MenuItem
            key={label}
            text={label}
            onClick={() => onChange(value)}
            icon={
              <Icon
                icon={selectedColor === value ? 'tick-circle' : value ? 'full-circle' : 'circle'}
                color={value || defaultColor}
              />
            }
          />
        ))}
        <MenuItem text="Custom" icon={IconSet.COLOR}>
          <SketchPicker
            color={selectedColor || defaultColor}
            onChangeComplete={handlePickCustomColor}
            disableAlpha
            presetColors={defaultColorOptions
              .filter((opt) => Boolean(opt.value))
              .map((opt) => opt.value)}
          />
        </MenuItem>
      </MenuItem>
    );
  },
);

export const enum DnDType {
  Collection = 'collection',
  Tag = 'tag',
}

/** Map that keeps track of the IDs that are expanded */
type IExpansionState = { [key: string]: boolean };

const enum ActionType {
  InsertNode,
  SetEditableNode,
  SetExpansion,
  ToggleExpansion,
  OpenExpansion,
}

type State = { expansion: IExpansionState; editableNode: ID | undefined };

type Action =
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
}

const isValid = (text: string) => text.trim().length > 0;

const Label = (props: ILabelProps) => {
  return (
    <>
      <span style={{ color: props.color }}>{props.icon}</span>
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
        props.text
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

interface ITagMenuProps extends Omit<ITagProps, 'nodeData' | 'isEditing' | 'pos'> {
  id: ID;
  color: string;
  isSelected: boolean;
}

const EditMenu = (props: any) => {
  return (
    <>
      <MenuItem onClick={props.rename} text="Rename" icon={IconSet.EDIT} />
      <MenuItem onClick={props.delete} text={`Delete${props.contextText}`} icon={IconSet.DELETE} />
      <ColorPickerMenu
        selectedColor={props.color}
        onChange={props.setColor}
        contextText={props.contextText}
      />
    </>
  );
};

const SearchMenu = (props: any) => {
  return (
    <>
      <MenuItem onClick={props.addSearch} text="Add to Search Query" icon={IconSet.SEARCH} />
      <MenuItem onClick={props.replaceSearch} text="Replace Search Query" icon={IconSet.REPLACE} />
    </>
  );
};

const TagContextMenu = ({ id, color, isSelected, uiStore, dispatch }: ITagMenuProps) => {
  const { tags, collections } = uiStore.getTagContextItems(id);
  let contextText = formatTagCountText(Math.max(0, tags.length - 1), collections.length);
  contextText = contextText && ` (${contextText})`;

  return (
    <Menu>
      <EditMenu
        rename={() => dispatch({ type: ActionType.SetEditableNode, payload: id })}
        delete={() => uiStore.openOutlinerTagRemover(isSelected ? 'selected' : id)}
        color={color}
        setColor={(color: string) => uiStore.colorSelectedTagsAndCollections(id, color)}
        contextText={contextText}
      />
      <Divider />
      <SearchMenu
        addSearch={() =>
          isSelected
            ? uiStore.replaceCriteriaWithTagSelection()
            : uiStore.addSearchCriteria(new ClientIDSearchCriteria('tags', id))
        }
        replaceSearch={() =>
          isSelected
            ? uiStore.replaceCriteriaWithTagSelection()
            : uiStore.replaceSearchCriteria(new ClientIDSearchCriteria('tags', id))
        }
      />
    </Menu>
  );
};

const PreviewTag = document.createElement('div');
PreviewTag.classList.add(Classes.TAG);
PreviewTag.classList.add(Classes.INTENT_PRIMARY);
PreviewTag.classList.add('tag-drag-drop');
PreviewTag.style.position = 'absolute';
PreviewTag.style.top = '-100vh';
document.body.appendChild(PreviewTag);

/**
 * Data attributes that will be available on every drag operation.
 */
export const enum DnDAttribute {
  Source = 'dndSource',
  Target = 'dndTarget',
  // DropEffect = 'dnd-drop-effect' // TODO: Combine this with custum pointer!
}

/**
 * Custom data related ONLY to the currently DRAGGED tag or collection
 *
 * Most importantly DO NOT just export this variable. Keeping it in this module
 * will prevent the data being accidentially overwritten. Otherwise create a
 * global variable that can be mutated by functions that capture the variable.
 */
let DragItem = { id: '', isSelected: false };

/** Clears all set data attributes. */
const onDragEnd = (event: React.DragEvent<HTMLDivElement>) => {
  delete event.currentTarget.dataset[DnDAttribute.Source];
  DragItem = { id: '', isSelected: false };
};

/** Sets preview image and current element as drag source */
const onDragStart = (
  event: React.DragEvent<HTMLDivElement>,
  name: string,
  dndType: DnDType,
  id: ID,
  isSelected: boolean,
  effectAllowed: string = 'move',
  dropEffect: string = 'move',
) => {
  PreviewTag.innerText = name;
  event.dataTransfer.setData(dndType, id);
  event.dataTransfer.setDragImage(PreviewTag, 0, 0);
  event.dataTransfer.effectAllowed = effectAllowed;
  event.dataTransfer.dropEffect = dropEffect;
  event.currentTarget.dataset[DnDAttribute.Source] = 'true';
  DragItem = { id, isSelected };
};

/** */
const onDragOver = (
  event: React.DragEvent<HTMLDivElement>,
  isSelected: boolean,
  accept: (t: string) => boolean,
  canDrop: (t: string) => boolean = () => true,
  dropEffect: string = 'move',
  sideEffect?: () => void,
) => {
  const dropTarget = event.currentTarget;
  const isSource = event.currentTarget.dataset[DnDAttribute.Source] === 'true';
  if (isSource || (DragItem.isSelected && isSelected)) {
    return;
  }
  // Since we only check for tags and collections we only need one type.
  const type = event.dataTransfer.types.find(accept);
  if (type && canDrop(type)) {
    event.dataTransfer.dropEffect = dropEffect;
    event.preventDefault();
    event.stopPropagation();
    dropTarget.dataset[DnDAttribute.Target] = 'true';
    sideEffect?.();
  }
};

const onDragLeave = (event: React.DragEvent<HTMLDivElement>, accept: (t: string) => boolean) => {
  if (event.dataTransfer.types.some(accept)) {
    event.dataTransfer.dropEffect = 'none';
    event.preventDefault();
    event.stopPropagation();
    delete event.currentTarget.dataset[DnDAttribute.Target];
  }
};

const handleTagDragLeave = (event: React.DragEvent<HTMLDivElement>) =>
  onDragLeave(event, (t) => t === DnDType.Tag);

const handleCollectionDragLeave = (event: React.DragEvent<HTMLDivElement>) =>
  onDragLeave(event, (t) => t === DnDType.Tag || t === DnDType.Collection);

const Tag = observer(({ nodeData, uiStore, dispatch, isEditing, pos }: ITagProps) => {
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

  const onDrop = useCallback(
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

  return (
    <div
      className="tag-label"
      draggable={!isEditing}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragLeave={handleTagDragLeave}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      onContextMenu={onContextMenu}
    >
      <Label
        text={nodeData.name}
        setText={nodeData.rename}
        color={nodeData.color}
        icon={IconSet.TAG}
        isEditing={isEditing}
        onSubmit={onSubmit}
      />
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
            .addTagCollection('New Collection')
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
      <EditMenu
        rename={() => dispatch({ type: ActionType.SetEditableNode, payload: nodeData.id })}
        delete={() =>
          uiStore.openOutlinerTagRemover(nodeData.isSelected ? 'selected' : nodeData.id)
        }
        color={nodeData.color}
        setColor={(color: string) => uiStore.colorSelectedTagsAndCollections(nodeData.id, color)}
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
      <SearchMenu
        addSearch={() =>
          nodeData.isSelected
            ? uiStore.replaceCriteriaWithTagSelection()
            : uiStore.addSearchCriterias(
                nodeData.getTagsRecursively().map((c: ID) => new ClientIDSearchCriteria('tags', c)),
              )
        }
        replaceSearch={() =>
          nodeData.isSelected
            ? uiStore.replaceCriteriaWithTagSelection()
            : uiStore.replaceSearchCriterias(
                nodeData.getTagsRecursively().map((c: ID) => new ClientIDSearchCriteria('tags', c)),
              )
        }
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

  const onDrop = useCallback(
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

  return (
    <div
      className="tag-label"
      draggable={!isEditing}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragLeave={handleCollectionDragLeave}
      onDragEnd={onDragEnd}
      onDrop={onDrop}
      onContextMenu={onContextMenu}
    >
      <Label
        text={nodeData.name}
        setText={nodeData.rename}
        color={nodeData.color}
        icon={expansion[nodeData.id] ? IconSet.TAG_GROUP_OPEN : IconSet.TAG_GROUP}
        isEditing={isEditing}
        onSubmit={onSubmit}
      />
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

// TODO: Split
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

const handleDragOverAndLeave = (event: React.DragEvent<HTMLDivElement>) => {
  if (event.dataTransfer.types.some((t) => t === DnDType.Tag || t === DnDType.Collection)) {
    event.preventDefault();
    event.stopPropagation();
  }
};

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

export default TagTree;
