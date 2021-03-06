import React, { useMemo, useState, useCallback, useReducer, useContext, useRef } from 'react';
import { runInAction } from 'mobx';
import { observer } from 'mobx-react-lite';

import { ID } from 'src/entities/ID';
import { ClientIDSearchCriteria } from 'src/entities/SearchCriteria';
import { ClientTag, ROOT_TAG_ID } from 'src/entities/Tag';
import StoreContext from 'src/frontend/contexts/StoreContext';
import UiStore from 'src/frontend/stores/UiStore';
import useContextMenu from 'src/frontend/hooks/useContextMenu';
import { IconSet, Tree } from 'widgets';
import { Toolbar, ToolbarButton, ContextMenu } from 'widgets/menus';
import { ITreeItem, createBranchOnKeyDown, createLeafOnKeyDown } from 'widgets/Tree';
import { TagRemoval } from 'src/frontend/components/RemovalAlert';
import { Collapse } from 'src/frontend/components/Collapse';
import { TagItemContextMenu } from './ContextMenu';
import { formatTagCountText } from 'src/frontend/utils';
import { IExpansionState } from '../../types';
import { Action, State, Factory, reducer } from './state';
import TagDnDContext, { DnDAttribute, DnDTagType } from 'src/frontend/contexts/TagDnDContext';

interface ILabelProps {
  text: string;
  setText: (value: string) => void;
  isEditing: boolean;
  onSubmit: (target: EventTarget & HTMLInputElement) => void;
  onClick: (event: React.MouseEvent) => void;
  onDoubleClick?: (event: React.MouseEvent) => void;
}

// const isValid = (text: string) => text.trim().length > 0;

const Label = (props: ILabelProps) =>
  props.isEditing ? (
    <input
      className="input"
      autoFocus
      type="text"
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
        } else if (e.key === 'Escape') {
          props.onSubmit(e.currentTarget); // cancel with escape
        }
      }}
      onFocus={(e) => e.target.select()}
      // TODO: Visualizing errors...
      // Only show red outline when input field is in focus and text is invalid
      // className={!isValidInput ? 'bp3-intent-danger' : ''}
    />
  ) : (
    <div onClick={props.onClick} onDoubleClick={props.onDoubleClick}>
      {props.text}
    </div>
  );

interface ITagItemProps {
  showContextMenu: (x: number, y: number, menu: JSX.Element) => void;
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

const PreviewTag = document.createElement('span');
PreviewTag.classList.add('tag');
PreviewTag.style.position = 'absolute';
PreviewTag.style.top = '-100vh';
document.body.appendChild(PreviewTag);

const TagItem = observer((props: ITagItemProps) => {
  const { nodeData, dispatch, expansion, isEditing, submit, pos, select, showContextMenu } = props;
  const { uiStore } = useContext(StoreContext);
  const dragData = useContext(TagDnDContext);

  const handleContextMenu = useCallback(
    (e) =>
      showContextMenu(
        e.clientX,
        e.clientY,
        <TagItemContextMenu dispatch={dispatch} tag={nodeData} pos={pos} />,
      ),
    [dispatch, nodeData, pos, showContextMenu],
  );

  const handleDragStart = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      runInAction(() => {
        let name = nodeData.name;
        if (nodeData.isSelected) {
          const ctx = uiStore.getTagContextItems(nodeData.id);
          const extraText = formatTagCountText(ctx.tags.length);
          if (extraText.length > 0) {
            name = name + `(${extraText})`;
          }
        }
        PreviewTag.innerText = name;
        event.dataTransfer.setData(DnDTagType, nodeData.id);
        event.dataTransfer.setDragImage(PreviewTag, 0, 0);
        event.dataTransfer.effectAllowed = 'linkMove';
        event.dataTransfer.dropEffect = 'move';
        event.currentTarget.dataset[DnDAttribute.Source] = 'true';
        dragData.item = nodeData;
      });
    },
    [dragData, nodeData, uiStore],
  );

  const handleDragOver = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      runInAction(() => {
        if (dragData.item === undefined) {
          return;
        }
        const dropTarget = event.currentTarget;
        const isSource = dropTarget.dataset[DnDAttribute.Source] === 'true';
        if (
          isSource ||
          (dragData.item.isSelected && nodeData.isSelected) ||
          nodeData.isAncestor(dragData.item)
        ) {
          return;
        }

        event.dataTransfer.dropEffect = 'move';
        event.preventDefault();
        event.stopPropagation();
        dropTarget.dataset[DnDAttribute.Target] = 'true';
        const posY = event.clientY;
        const rect = dropTarget.getBoundingClientRect();
        const [top, bottom] = [rect.top + 8, rect.bottom - 8];
        if (posY <= top) {
          dropTarget.classList.add('top');
          dropTarget.classList.remove('bottom');
        } else if (posY >= bottom) {
          dropTarget.classList.add('bottom');
          dropTarget.classList.remove('top');
        } else {
          dropTarget.classList.remove('top');
          dropTarget.classList.remove('bottom');
        }

        if (!expansion[nodeData.id]) {
          dispatch(Factory.expandNode(nodeData.id));
        }
      });
    },
    [dispatch, dragData, expansion, nodeData],
  );

  const handleDragLeave = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      if (runInAction(() => dragData.item !== undefined)) {
        event.dataTransfer.dropEffect = 'none';
        event.preventDefault();
        event.stopPropagation();
        event.currentTarget.dataset[DnDAttribute.Target] = 'false';
        event.currentTarget.classList.remove('top');
        event.currentTarget.classList.remove('bottom');
      }
    },
    [dragData],
  );

  const handleDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      const dataSet = event.currentTarget.dataset;
      runInAction(() => {
        if (dragData.item?.isSelected) {
          uiStore.moveSelectedTagItems(nodeData.id);
        } else if (dragData.item !== undefined) {
          if (event.currentTarget.classList.contains('top')) {
            nodeData.parent.insertSubTag(dragData.item, pos - 1); // 'pos' does not start from 0!
          } else if (event.currentTarget.classList.contains('bottom')) {
            nodeData.parent.insertSubTag(dragData.item, pos);
          } else {
            nodeData.insertSubTag(dragData.item, 0);
          }
        }
      });
      dataSet[DnDAttribute.Target] = 'false';
      event.currentTarget.classList.remove('top');
      event.currentTarget.classList.remove('bottom');
    },
    [dragData, nodeData, pos, uiStore],
  );

  const handleSelect = useCallback((event: React.MouseEvent) => select(event, nodeData), [
    nodeData,
    select,
  ]);

  const handleQuickQuery = useCallback(
    (event: React.MouseEvent) => {
      runInAction(() => {
        const query = new ClientIDSearchCriteria('tags', nodeData.id, nodeData.name);
        if (event.ctrlKey) {
          if (!nodeData.isSearched) {
            uiStore.addSearchCriteria(query);
          }
        } else {
          uiStore.replaceSearchCriteria(query);
        }
      });
    },
    [nodeData, uiStore],
  );

  const handleRename = useCallback(() => dispatch(Factory.enableEditing(nodeData.id)), [
    dispatch,
    nodeData.id,
  ]);

  return (
    <div
      className="tree-content-label"
      draggable={!isEditing}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onContextMenu={handleContextMenu}
    >
      {!nodeData.subTags.length && <span style={{ color: nodeData.viewColor }}>{IconSet.TAG}</span>}
      <Label
        text={nodeData.name}
        setText={nodeData.rename}
        isEditing={isEditing}
        onSubmit={submit}
        onClick={handleQuickQuery}
        onDoubleClick={handleRename}
      />
      {!isEditing && (
        <button onClick={handleSelect} className="btn-icon">
          {uiStore.tagSelection.has(nodeData) ? IconSet.SELECT_ALL_CHECKED : IconSet.SELECT_ALL}
        </button>
      )}
    </div>
  );
});

interface ITreeData {
  showContextMenu: (x: number, y: number, menu: JSX.Element) => void;
  state: State;
  dispatch: React.Dispatch<Action>;
  submit: (target: EventTarget & HTMLInputElement) => void;
  select: (event: React.MouseEvent, nodeData: ClientTag) => void;
}

const TagItemLabel = (
  nodeData: ClientTag,
  treeData: ITreeData,
  _level: number,
  _size: number,
  pos: number,
) => (
  <TagItem
    showContextMenu={treeData.showContextMenu}
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

const toggleSelection = (uiStore: UiStore, nodeData: ClientTag) =>
  uiStore.toggleTagSelection(nodeData);

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
  uiStore: UiStore,
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
      toggleQuery(nodeData, uiStore);
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

const mapTag = (tag: ClientTag): ITreeItem => ({
  id: tag.id,
  label: TagItemLabel,
  children: tag.subTags.map(mapTag),
  nodeData: tag,
  isExpanded,
  isSelected,
  className: tag.isSearched ? 'searched' : undefined,
});

const TagsTree = observer(() => {
  const { tagStore, uiStore } = useContext(StoreContext);
  const root = tagStore.root;
  const [state, dispatch] = useReducer(reducer, {
    expansion: {},
    editableNode: undefined,
    deletableNode: undefined,
  });
  const [contextState, { show, hide }] = useContextMenu();
  const dragData = useContext(TagDnDContext);

  /** Header and Footer drop zones of the root node */
  const handleDragOverAndLeave = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      if (runInAction(() => dragData.item !== undefined)) {
        event.preventDefault();
        event.stopPropagation();
      }
    },
    [dragData],
  );

  const submit = useCallback((target: EventTarget & HTMLInputElement) => {
    target.focus();
    dispatch(Factory.disableEditing());
    target.setSelectionRange(0, 0);
  }, []);

  // Handles selection via click event
  const lastSelection = useRef<ID | null>(null);
  const select = useCallback(
    (e: React.MouseEvent, nodeData: ClientTag) => {
      if (e.shiftKey && lastSelection.current !== null && lastSelection.current !== nodeData.id) {
        uiStore.selectTagRange(nodeData, lastSelection.current);
        lastSelection.current = nodeData.id;
      } else {
        uiStore.toggleTagSelection(nodeData);
        lastSelection.current = nodeData.id;
      }
    },
    [uiStore],
  );

  const treeData: ITreeData = useMemo(
    () => ({
      showContextMenu: show,
      state,
      dispatch,
      submit,
      select,
    }),
    [select, show, state, submit],
  );

  const [isCollapsed, setIsCollapsed] = useState(false);

  const handleRootAddTag = useCallback(
    () =>
      tagStore
        .create(root, 'New Tag')
        .then((tag) => dispatch(Factory.enableEditing(tag.id)))
        .catch((err) => console.log('Could not create tag', err)),
    [root, tagStore],
  );

  const handleDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      const dataSet = event.currentTarget.dataset;
      runInAction(() => {
        if (dragData.item?.isSelected) {
          uiStore.moveSelectedTagItems(ROOT_TAG_ID);
        } else if (dragData.item !== undefined) {
          root.insertSubTag(dragData.item, tagStore.tagList.length);
        }
        dataSet[DnDAttribute.Target] = 'false';
      });
    },
    [dragData, root, tagStore, uiStore],
  );

  const handleBranchOnKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLLIElement>, nodeData: ClientTag, treeData: ITreeData) =>
      createBranchOnKeyDown(
        event,
        nodeData,
        treeData,
        isExpanded,
        toggleSelection.bind(null, uiStore),
        toggleExpansion,
        customKeys.bind(null, uiStore),
      ),
    [uiStore],
  );

  const handleLeafOnKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLLIElement>, nodeData: ClientTag, treeData: ITreeData) =>
      createLeafOnKeyDown(
        event,
        nodeData,
        treeData,
        toggleSelection.bind(null, uiStore),
        customKeys.bind(null, uiStore),
      ),
    [uiStore],
  );

  return (
    <>
      <header
        onDragOver={handleDragOverAndLeave}
        onDragLeave={handleDragOverAndLeave}
        onDrop={handleDrop}
      >
        <h2 onClick={() => setIsCollapsed(!isCollapsed)}>Tags</h2>
        <Toolbar controls="tag-hierarchy">
          {uiStore.tagSelection.size > 0 ? (
            <ToolbarButton
              showLabel="never"
              icon={IconSet.CLOSE}
              text="Clear"
              onClick={uiStore.clearTagSelection}
              tooltip="Clear Selection"
            />
          ) : (
            <ToolbarButton
              showLabel="never"
              icon={IconSet.TAG_ADD}
              text="New Tag"
              onClick={handleRootAddTag}
              tooltip="Add a new tag"
            />
          )}
        </Toolbar>
      </header>

      <Collapse open={!isCollapsed}>
        {root.subTags.length === 0 ? (
          <div className="tree-content-label" style={{ padding: '0.25rem' }}>
            {/* <span className="pre-icon">{IconSet.INFO}</span> */}
            {/* No tags or collections created yet */}
            <i style={{ marginLeft: '1em' }}>None</i>
          </div>
        ) : (
          <Tree
            multiSelect
            id="tag-hierarchy"
            className={uiStore.tagSelection.size > 0 ? 'selected' : undefined}
            children={root.subTags.map(mapTag)}
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
          object={state.deletableNode}
          onClose={() => dispatch(Factory.abortDeletion())}
        />
      )}
      <ContextMenu isOpen={contextState.open} x={contextState.x} y={contextState.y} close={hide}>
        {contextState.menu}
      </ContextMenu>
    </>
  );
});

export default TagsTree;
