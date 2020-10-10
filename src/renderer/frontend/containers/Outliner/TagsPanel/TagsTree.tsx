import React, { useMemo, useState, useCallback, useReducer, useContext, useRef } from 'react';
import { observer } from 'mobx-react-lite';
import { ContextMenu, Collapse, H4, Icon, InputGroup } from '@blueprintjs/core';

import { Tree, Toolbar, ToolbarButton } from 'components';
import IconSet from 'components/Icons';
import { createBranchOnKeyDown, createLeafOnKeyDown, ITreeItem } from 'components/Tree';
import { TagRemoval } from '../MessageBox';
import { ClientIDSearchCriteria } from 'src/renderer/entities/SearchCriteria';
import { ClientTag, ROOT_TAG_ID } from 'src/renderer/entities/Tag';
import { ID } from 'src/renderer/entities/ID';
import UiStore from 'src/renderer/frontend/stores/UiStore';
import { TagItemContextMenu } from './ContextMenu';
import {
  DnDType,
  onDragOver,
  onDragStart,
  handleDragLeave,
  handleDragEnd,
  DnDAttribute,
  DragItem,
  handleDragOverAndLeave,
} from './DnD';
import { formatTagCountText } from 'src/renderer/frontend/utils';
import { IExpansionState } from '..';
import { Action, State, Factory, reducer } from './StateReducer';
import StoreContext from 'src/renderer/frontend/contexts/StoreContext';

interface ILabelProps {
  text: string;
  setText: (value: string) => void;
  isEditing: boolean;
  onSubmit: (target: EventTarget & HTMLInputElement) => void;
  onClick: (event: React.MouseEvent) => void;
}

// const isValid = (text: string) => text.trim().length > 0;

const Label = (props: ILabelProps) =>
  props.isEditing ? (
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
  );

interface ITagItemProps {
  nodeData: ClientTag;
  dispatch: React.Dispatch<Action>;
  isEditing: boolean;
  submit: (target: EventTarget & HTMLInputElement) => void;
  select: (event: React.MouseEvent, nodeData: ClientTag) => void;
  pos: number;
  expansion: IExpansionState;
}

/**
 * Toggles Query
 *
 * All it does is remove the query if it already searched, otherwise adds a
 * query. Handling filter mode or replacing the search criteria list is up to
 * the component.
 */
const toggleQuery = (nodeData: ClientTag, uiStore: UiStore) => {
  if (nodeData.isSearched) {
    // if it already exists, then remove it
    const alreadySearchedCrit = uiStore.searchCriteriaList.find((c) =>
      (c as ClientIDSearchCriteria<any>)?.value?.includes(nodeData.id),
    );

    if (alreadySearchedCrit) {
      uiStore.replaceSearchCriterias(
        uiStore.searchCriteriaList.filter((c) => c !== alreadySearchedCrit),
      );
    }
  } else {
    uiStore.addSearchCriteria(new ClientIDSearchCriteria('tags', nodeData.id));
  }
};

const TagItem = observer((props: ITagItemProps) => {
  const { nodeData, dispatch, expansion, isEditing, submit, pos, select } = props;
  const { tagStore, uiStore } = useContext(StoreContext);

  const handleContextMenu = useCallback(
    (e) =>
      ContextMenu.show(
        <TagItemContextMenu
          dispatch={dispatch}
          nodeData={nodeData}
          pos={pos}
          tagStore={tagStore}
          uiStore={uiStore}
        />,
        { left: e.clientX, top: e.clientY },
        undefined,
        uiStore.theme === 'DARK',
      ),
    [dispatch, nodeData, pos, tagStore, uiStore],
  );

  const handleDragStart = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      let name = nodeData.name;
      if (nodeData.isSelected) {
        const ctx = uiStore.getTagContextItems(nodeData.id);
        const extraText = formatTagCountText(ctx.tags.length);
        if (extraText.length > 0) {
          name = name + `(${extraText})`;
        }
      }
      onDragStart(event, name, nodeData.id, nodeData.isSelected);
    },
    [nodeData, uiStore],
  );

  const handleDragOver = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      const canDrop = onDragOver(event, nodeData.isSelected, () => {
        const draggedTag = tagStore.get(DragItem.id);
        if (draggedTag !== undefined) {
          // Cannot drop on a descendant!
          return !nodeData.isAncestor(draggedTag);
        }
        return true;
      });
      if (canDrop && !expansion[nodeData.id]) {
        dispatch(Factory.expandNode(nodeData.id));
      }
    },
    [dispatch, expansion, nodeData, tagStore],
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
      if (event.dataTransfer.types.includes(DnDType)) {
        event.dataTransfer.dropEffect = 'none';
        const id = event.dataTransfer.getData(DnDType);
        const tag = tagStore.get(id);
        if (tag !== undefined) {
          if (event.currentTarget.classList.contains('top')) {
            nodeData.parent.insertSubTag(tag, pos - 1); // 'pos' does not start from 0!
          } else if (event.currentTarget.classList.contains('bottom')) {
            nodeData.parent.insertSubTag(tag, pos);
          } else {
            nodeData.insertSubTag(tag, 0);
          }
        }
        dataSet[DnDAttribute.Target] = 'false';
        event.currentTarget.classList.remove('top');
        event.currentTarget.classList.remove('bottom');
      }
    },
    [nodeData, pos, tagStore, uiStore],
  );

  const handleSelect = useCallback((event: React.MouseEvent) => select(event, nodeData), [
    nodeData,
    select,
  ]);

  const handleQuickQuery = useCallback(
    (event: React.MouseEvent) => {
      const query = new ClientIDSearchCriteria('tags', nodeData.id, nodeData.name);
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
      onDragLeave={handleDragLeave}
      onDragEnd={handleDragEnd}
      onDrop={handleDrop}
      onContextMenu={handleContextMenu}
    >
      <span className="pre-icon" style={{ color: nodeData.color }}>
        {IconSet.TAG}
      </span>
      <Label
        text={nodeData.name}
        setText={nodeData.rename}
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

interface ITreeData {
  state: State;
  dispatch: React.Dispatch<Action>;
  submit: (target: EventTarget & HTMLInputElement) => void;
  select: (event: React.MouseEvent, nodeData: ClientTag) => void;
  uiStore: UiStore;
}

const TagItemLabel = (
  nodeData: ClientTag,
  treeData: ITreeData,
  _level: number,
  _size: number,
  pos: number,
) => (
  <TagItem
    nodeData={nodeData}
    dispatch={treeData.dispatch}
    expansion={treeData.state.expansion}
    isEditing={treeData.state.editableNode === nodeData.id}
    submit={treeData.submit}
    pos={pos}
    select={treeData.select}
  />
);

const isSelected = (nodeData: ClientTag): boolean => nodeData.isSelected;

const isExpanded = (nodeData: ClientTag, treeData: ITreeData): boolean =>
  treeData.state.expansion[nodeData.id];

const toggleExpansion = (nodeData: ClientTag, treeData: ITreeData) =>
  treeData.dispatch(Factory.toggleNode(nodeData.id));

const toggleSelection = (nodeData: ClientTag, { uiStore }: ITreeData) => {
  nodeData.isSelected
    ? uiStore.deselectTags(nodeData.getTagsRecursively())
    : uiStore.selectTags(nodeData.getTagsRecursively());
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
  nodeData: ClientTag,
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
  nodeData: ClientTag,
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

// Range Selection using pre-order tree traversal
const rangeSelection = (
  selection: ID[],
  nodeData: ClientTag,
  lastSelection: ID,
  root: ClientTag,
) => {
  let isSelecting = false;
  const selectRange = (node: ClientTag) => {
    if (node.id === lastSelection || node.id === nodeData.id) {
      if (!isSelecting) {
        // Start selection
        isSelecting = true;
      } else {
        // End selection
        selection.push(node.id);
        isSelecting = false;
        return;
      }
    }

    if (isSelecting) {
      selection.push(node.id);
    }

    for (const subTag of node.clientSubTags) {
      selectRange(subTag);
    }
  };

  selectRange(root);
};

const mapTag = (tag: ClientTag): ITreeItem => ({
  id: tag.id,
  label: TagItemLabel,
  children: tag.clientSubTags.map(mapTag),
  nodeData: tag,
  isExpanded,
  isSelected,
  className: tag.isSearched ? 'searched' : undefined,
});

const TagsTree = observer(() => {
  const { tagStore, uiStore } = useContext(StoreContext);
  const root = tagStore.root;
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
  const activeSelection = useRef<ID | null>(null);
  const select = useCallback(
    (event: React.MouseEvent, nodeData: ClientTag) => {
      const lastSelection = activeSelection.current;
      if (event.shiftKey && lastSelection !== null && lastSelection !== nodeData.id) {
        // Batch selection
        const selection: ID[] = [];
        rangeSelection(selection, nodeData, lastSelection, root);
        uiStore.selectTags(selection, true);
        activeSelection.current = nodeData.id;
      } else {
        // Toggles selection state of a single node
        const nextLastSelection = nodeData.isSelected ? null : nodeData.id;
        nodeData.isSelected ? uiStore.deselectTag(nodeData) : uiStore.selectTag(nodeData);
        activeSelection.current = nextLastSelection;
      }
    },
    [root, uiStore],
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
        .create(root, 'New Tag')
        .then((tag) => dispatch(Factory.enableEditing(tag.id)))
        .catch((err) => console.log('Could not create tag', err));
    },
    [root, tagStore],
  );

  const handleCollapse = useCallback(() => {
    activeSelection.current = null;
    dispatch(Factory.setExpansion({}));
  }, []);

  const handleDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      const dataSet = event.currentTarget.dataset;
      if (DragItem.isSelected) {
        uiStore.moveSelectedTagItems(ROOT_TAG_ID);
        dataSet[DnDAttribute.Target] = 'false';
        return;
      }
      if (event.dataTransfer.types.includes(DnDType)) {
        event.dataTransfer.dropEffect = 'none';
        const data = event.dataTransfer.getData(DnDType);
        const tag = tagStore.get(data);
        if (tag) {
          root.insertSubTag(tag, tagStore.tagList.length);
        }
        dataSet[DnDAttribute.Target] = 'false';
      }
    },
    [root, tagStore, uiStore],
  );

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
                tooltip="Add a new tag"
              />
              <ToolbarButton
                showLabel="never"
                icon={IconSet.ITEM_COLLAPS}
                label="Collapse"
                onClick={handleCollapse}
                tooltip="Close all tags"
              />
            </>
          )}
        </Toolbar>
      </div>

      <Collapse isOpen={!isCollapsed}>
        {root.subTags.length === 0 ? (
          <div className="tree-content-label" style={{ padding: '0.25rem' }}>
            <span className="pre-icon">{IconSet.INFO}</span>
            No tags or collections created yet
          </div>
        ) : (
          <Tree
            multiSelect
            id="tag-hierarchy"
            className={uiStore.tagSelection.size > 0 ? 'selected' : undefined}
            children={root.clientSubTags.map(mapTag)}
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
