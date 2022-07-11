import { formatTagCountText } from 'common/fmt';
import { action, runInAction } from 'mobx';
import { observer } from 'mobx-react-lite';
import React, { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { ClientFileSearchCriteria } from 'src/entities/SearchCriteria';
import { ClientTag, ROOT_TAG_ID } from 'src/entities/Tag';
import { TagRemoval } from 'src/frontend/components/RemovalAlert';
import { TagMerge } from 'src/frontend/containers/Outliner/TagsPanel/TagMerge';
import { useStore } from 'src/frontend/contexts/StoreContext';
import { DnDTagType, useTagDnD } from 'src/frontend/contexts/TagDnDContext';
import { useAction } from 'src/frontend/hooks/mobx';
import TagStore from 'src/frontend/stores/TagStore';
import UiStore from 'src/frontend/stores/UiStore';
import { IconSet, Tree } from 'widgets';
import { Toolbar, ToolbarButton, useContextMenu } from 'widgets/menus';
import MultiSplitPane, { MultiSplitPaneProps } from 'widgets/MultiSplit/MultiSplitPane';
import { createBranchOnKeyDown, createLeafOnKeyDown, ITreeItem, TreeLabel } from 'widgets/Tree';
import { IExpansionState } from '../../types';
import { HOVER_TIME_TO_EXPAND } from '../LocationsPanel/useFileDnD';
import { createDragReorderHelper } from '../TreeItemDnD';
import TreeItemRevealer from '../TreeItemRevealer';
import { TagItemContextMenu } from './ContextMenu';
import SearchButton from './SearchButton';
import { Action, Factory, reducer, State } from './state';

export class TagsTreeItemRevealer extends TreeItemRevealer {
  public static readonly instance: TagsTreeItemRevealer = new TagsTreeItemRevealer();
  private constructor() {
    super();
    this.revealTag = action(this.revealTag.bind(this));
  }

  initialize(setExpansion: React.Dispatch<React.SetStateAction<IExpansionState>>) {
    super.initializeExpansion(setExpansion);
  }

  revealTag(tag: ClientTag) {
    const tagsToExpand = Array.from(tag.getAncestors(), (t) => t.id);
    tagsToExpand.push(ROOT_TAG_ID);
    this.revealTreeItem(tagsToExpand);
  }
}

interface ILabelProps {
  text: string;
  setText: (value: string) => void;
  isEditing: boolean;
  onSubmit: (target: EventTarget & HTMLInputElement) => void;
  tooltip?: string;
}

const Label = (props: ILabelProps) =>
  props.isEditing ? (
    <input
      className="input"
      autoFocus
      type="text"
      defaultValue={props.text}
      onBlur={(e) => {
        const value = e.currentTarget.value.trim();
        if (value.length > 0) {
          props.setText(value);
        }
        props.onSubmit(e.currentTarget);
      }}
      onKeyDown={(e) => {
        e.stopPropagation();
        const value = e.currentTarget.value.trim();
        if (e.key === 'Enter' && value.length > 0) {
          props.setText(value);
          props.onSubmit(e.currentTarget);
        } else if (e.key === 'Escape') {
          props.onSubmit(e.currentTarget); // cancel with escape
        }
      }}
      onFocus={(e) => e.target.select()}
      // Stop propagation so that the parent Tag element doesn't toggle selection status
      onClick={(e) => e.stopPropagation()}
      // TODO: Visualizing errors...
      // Only show red outline when input field is in focus and text is invalid
    />
  ) : (
    <div className="label-text" data-tooltip={props.tooltip}>
      {props.text}
    </div>
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
    const alreadySearchedCrit = uiStore.searchCriteriaList.find(
      (c) => c.key === 'tags' && c.value.at(0) === nodeData.id,
    );
    if (alreadySearchedCrit) {
      uiStore.replaceSearchCriteria(
        ...uiStore.searchCriteriaList.filter((c) => c !== alreadySearchedCrit),
      );
    }
  } else {
    uiStore.addSearchCriteria(ClientFileSearchCriteria.tags('containsRecursively', [nodeData.id]));
  }
};

const DnDHelper = createDragReorderHelper('tag-dnd-preview', DnDTagType);

const TagItem = observer((props: ITagItemProps) => {
  const { nodeData, dispatch, expansion, isEditing, submit, pos, select } = props;
  const { uiStore } = useStore();
  const dndData = useTagDnD();

  const show = useContextMenu();
  const handleContextMenu = useCallback(
    (e) =>
      show(
        e.clientX,
        e.clientY,
        <TagItemContextMenu dispatch={dispatch} tag={nodeData} pos={pos} />,
      ),
    [dispatch, nodeData, pos, show],
  );

  const handleDragStart = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      runInAction(() => {
        let name = nodeData.name;
        if (nodeData.isSelected) {
          const ctx = uiStore.getTagContextItems(nodeData.id);
          if (ctx.length === 1) {
            name = ctx[0].name;
          } else {
            const extraText = formatTagCountText(ctx.length);
            if (extraText.length > 0) {
              name += ` (${extraText})`;
            }
          }
        }
        DnDHelper.onDragStart(event, name, uiStore.theme, dndData, nodeData);
      });
    },
    [dndData, nodeData, uiStore],
  );

  // Don't expand immediately on drag-over, only after hovering over it for a second or so
  const [expandTimeoutId, setExpandTimeoutId] = useState<number>();
  const expandDelayed = useCallback(
    (nodeId: string) => {
      if (expandTimeoutId) {
        clearTimeout(expandTimeoutId);
      }
      const t = window.setTimeout(() => {
        dispatch(Factory.expandNode(nodeId));
      }, HOVER_TIME_TO_EXPAND);
      setExpandTimeoutId(t);
    },
    [expandTimeoutId, dispatch],
  );

  const handleDragOver = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      runInAction(() => {
        if (
          (dndData.source?.isSelected && nodeData.isSelected) ||
          nodeData.isAncestor(dndData.source!)
        ) {
          return;
        }

        const isIgnored = DnDHelper.onDragOver(event, dndData);
        if (isIgnored) {
          return;
        }

        // Don't expand when hovering over top/bottom border
        const targetClasses = event.currentTarget.classList;
        if (targetClasses.contains('top') || targetClasses.contains('bottom')) {
          if (expandTimeoutId) {
            clearTimeout(expandTimeoutId);
            setExpandTimeoutId(undefined);
          }
        } else if (!expansion[nodeData.id] && !expandTimeoutId) {
          expandDelayed(nodeData.id);
        }
      });
    },
    [dndData, expandDelayed, expandTimeoutId, expansion, nodeData],
  );

  const handleDragLeave = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      if (runInAction(() => dndData.source !== undefined)) {
        DnDHelper.onDragLeave(event);

        if (expandTimeoutId) {
          clearTimeout(expandTimeoutId);
          setExpandTimeoutId(undefined);
        }
      }
    },
    [dndData, expandTimeoutId],
  );

  const handleDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      runInAction(() => {
        const relativeMovePos = DnDHelper.onDrop(event);

        // Expand the tag if it's not already expanded
        if (!expansion[nodeData.id]) {
          dispatch(Factory.setExpansion((val) => ({ ...val, [nodeData.id]: true })));
        }

        // Note to self: 'pos' does not start from 0! It is +1'd. So, here we -1 it again
        if (dndData.source?.isSelected) {
          if (relativeMovePos === 'middle') {
            uiStore.moveSelectedTagItems(nodeData.id);
          } else {
            uiStore.moveSelectedTagItems(nodeData.parent.id, pos + relativeMovePos);
          }
        } else if (dndData.source !== undefined) {
          if (relativeMovePos === 'middle') {
            nodeData.insertSubTag(dndData.source, 0);
          } else {
            nodeData.parent.insertSubTag(dndData.source, pos + relativeMovePos);
          }
        }
      });

      if (expandTimeoutId) {
        clearTimeout(expandTimeoutId);
        setExpandTimeoutId(undefined);
      }
    },
    [dispatch, dndData, expandTimeoutId, expansion, nodeData, pos, uiStore],
  );

  const handleSelect = useCallback(
    (event: React.MouseEvent) => {
      event.stopPropagation();
      select(event, nodeData);
    },
    [nodeData, select],
  );

  const handleQuickQuery = useCallback(
    (event: React.MouseEvent) => {
      runInAction(() => {
        event.stopPropagation();
        if (nodeData.isSearched) {
          // if already searched, un-search
          const crit = uiStore.searchCriteriaList.find(
            (c) => c.key === 'tags' && c.value.at(0) === nodeData.id,
          );
          if (crit) {
            uiStore.removeSearchCriteria(crit);
          }
        } else {
          // otherwise, search it
          const query = ClientFileSearchCriteria.tags('containsRecursively', [nodeData.id]);
          if (event.ctrlKey || event.metaKey) {
            uiStore.addSearchCriteria(query);
          } else {
            uiStore.replaceSearchCriteria(query);
          }
        }
      });
    },
    [nodeData, uiStore],
  );

  const handleRename = useCallback(
    () => dispatch(Factory.enableEditing(nodeData.id)),
    [dispatch, nodeData.id],
  );

  useEffect(
    () =>
      TagsTreeItemRevealer.instance.initialize(
        (val: IExpansionState | ((prevState: IExpansionState) => IExpansionState)) =>
          dispatch(Factory.setExpansion(val)),
      ),
    [dispatch],
  );

  return (
    <div
      className="tree-content-label"
      draggable={!isEditing}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onContextMenu={handleContextMenu}
      onClick={handleSelect}
      onDoubleClick={handleRename}
    >
      <span style={{ color: nodeData.viewColor }}>
        {nodeData.isHidden ? IconSet.HIDDEN : IconSet.TAG}
      </span>
      <Label
        text={nodeData.name}
        setText={nodeData.rename}
        isEditing={isEditing}
        onSubmit={submit}
        tooltip={`${nodeData.path.join(' › ')} (${nodeData.fileCount})`}
      />
      {!isEditing && <SearchButton onClick={handleQuickQuery} isSearched={nodeData.isSearched} />}
    </div>
  );
});

interface ITreeData {
  state: State;
  dispatch: React.Dispatch<Action>;
  submit: (target: EventTarget & HTMLInputElement) => void;
  select: (event: React.MouseEvent, nodeData: ClientTag) => void;
}

const TagItemLabel: TreeLabel = ({
  nodeData,
  treeData,
  pos,
}: {
  nodeData: ClientTag;
  treeData: ITreeData;
  pos: number;
}) => (
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

const toggleSelection = action((uiStore: UiStore, nodeData: ClientTag) => {
  uiStore.tagSelection.toggleAdditive(nodeData);
});

const triggerContextMenuEvent = (event: React.KeyboardEvent<HTMLLIElement>) => {
  const element = event.currentTarget.querySelector('.tree-content-label');
  if (element !== null) {
    event.stopPropagation();
    const rect = element.getBoundingClientRect();
    element.dispatchEvent(
      new MouseEvent('contextmenu', {
        clientX: rect.right,
        clientY: rect.top,
        bubbles: true,
      }),
    );
  }
};

const customKeys = (
  uiStore: UiStore,
  tagStore: TagStore,
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

const TagsTree = observer((props: Partial<MultiSplitPaneProps>) => {
  const { tagStore, uiStore } = useStore();
  const root = tagStore.root;
  const [state, dispatch] = useReducer(reducer, {
    expansion: {},
    editableNode: undefined,
    deletableNode: undefined,
    mergableNode: undefined,
  });
  const dndData = useTagDnD();

  /** Header and Footer drop zones of the root node */
  const handleDragOverAndLeave = useAction((event: React.DragEvent<HTMLDivElement>) => {
    if (dndData.source !== undefined) {
      event.preventDefault();
      event.stopPropagation();
    }
  });

  const submit = useRef((target: EventTarget & HTMLInputElement) => {
    target.focus();
    dispatch(Factory.disableEditing());
    target.setSelectionRange(0, 0);
  });

  // Handles selection via click event
  const select = useAction((e: React.MouseEvent, selectedTag: ClientTag) => {
    const tagSelection = uiStore.tagSelection;
    // Note: selection logic is copied from Gallery.tsx
    const rangeSelection = e.shiftKey;
    const expandSelection = e.ctrlKey || e.metaKey;

    /** The index of the active (newly selected) item */
    const i = tagStore.findFlatTagListIndex(selectedTag);

    // If nothing is selected, initialize the selection range and select that single item
    if (tagSelection.lastSelection === undefined) {
      tagSelection.initialSelection = i;
      tagSelection.lastSelection = i;
      uiStore.tagSelection.toggleAdditive(selectedTag);
      return;
    }

    // Mark this index as the last item that was selected
    tagSelection.lastSelection = i;

    if (rangeSelection && tagSelection.initialSelection !== undefined) {
      if (i === undefined) {
        return;
      }
      if (i < tagSelection.initialSelection) {
        uiStore.selectTagRange(i, tagSelection.initialSelection, expandSelection);
      } else {
        uiStore.selectTagRange(tagSelection.initialSelection, i, expandSelection);
      }
    } else if (expandSelection) {
      uiStore.tagSelection.toggleAdditive(selectedTag);
      tagSelection.initialSelection = i;
    } else {
      if (selectedTag.isSelected && uiStore.tagSelection.size === 1) {
        uiStore.tagSelection.clear();
        (document.activeElement as HTMLElement | null)?.blur();
      } else {
        uiStore.tagSelection.select(selectedTag);
      }
      tagSelection.initialSelection = i;
    }
  });

  const treeData: ITreeData = useMemo(
    () => ({
      state,
      dispatch,
      submit: submit.current,
      select,
    }),
    [select, state],
  );

  const handleRootAddTag = useAction(() =>
    tagStore
      .create(tagStore.root, 'New Tag')
      .then((tag) => dispatch(Factory.enableEditing(tag.id)))
      .catch((err) => console.log('Could not create tag', err)),
  );

  const handleDrop = useAction(() => {
    if (dndData.source?.isSelected) {
      uiStore.moveSelectedTagItems(ROOT_TAG_ID);
    } else if (dndData.source !== undefined) {
      const { root } = tagStore;
      root.insertSubTag(dndData.source, root.subTags.length);
    }
  });

  const handleBranchOnKeyDown = useAction(
    (event: React.KeyboardEvent<HTMLLIElement>, nodeData: ClientTag, treeData: ITreeData) =>
      createBranchOnKeyDown(
        event,
        nodeData,
        treeData,
        isExpanded,
        toggleSelection.bind(null, uiStore),
        toggleExpansion,
        customKeys.bind(null, uiStore, tagStore),
      ),
  );

  const handleLeafOnKeyDown = useAction(
    (event: React.KeyboardEvent<HTMLLIElement>, nodeData: ClientTag, treeData: ITreeData) =>
      createLeafOnKeyDown(
        event,
        nodeData,
        treeData,
        toggleSelection.bind(null, uiStore),
        customKeys.bind(null, uiStore, tagStore),
      ),
  );

  const handleKeyDown = useAction((e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') {
      uiStore.tagSelection.clear();
      (document.activeElement as HTMLElement | null)?.blur();
      e.stopPropagation();
    } else {
      props.onKeyDown?.(e);
    }
  });

  const clearTagSelection = useAction(() => uiStore.tagSelection.clear());

  return (
    <MultiSplitPane
      id="tags"
      title="Tags"
      onKeyDown={handleKeyDown}
      headerProps={{
        onDragOver: handleDragOverAndLeave,
        onDragLeave: handleDragOverAndLeave,
        onDrop: handleDrop,
      }}
      headerToolbar={
        <Toolbar controls="tag-hierarchy" isCompact>
          {!uiStore.tagSelection.isEmpty ? (
            <ToolbarButton
              icon={IconSet.CLOSE}
              text="Clear"
              onClick={clearTagSelection}
              tooltip="Clear Selection"
            />
          ) : (
            <ToolbarButton
              icon={IconSet.PLUS}
              text="New Tag"
              onClick={handleRootAddTag}
              tooltip="Add a new tag"
            />
          )}
        </Toolbar>
      }
      {...props}
    >
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
          className={!uiStore.tagSelection.isEmpty ? 'selected' : undefined}
          children={root.subTags.map(mapTag)}
          treeData={treeData}
          toggleExpansion={toggleExpansion}
          onBranchKeyDown={handleBranchOnKeyDown}
          onLeafKeyDown={handleLeafOnKeyDown}
        />
      )}

      {/* Used for dragging collection to root of hierarchy and for deselecting tag selection */}
      <div
        id="tree-footer"
        onClick={clearTagSelection}
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

      {state.mergableNode && (
        <TagMerge tag={state.mergableNode} onClose={() => dispatch(Factory.abortMerge())} />
      )}
    </MultiSplitPane>
  );
});

export default TagsTree;
