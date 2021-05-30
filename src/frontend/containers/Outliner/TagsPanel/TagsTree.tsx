import { runInAction } from 'mobx';
import { observer } from 'mobx-react-lite';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { ClientTagSearchCriteria } from 'src/entities/SearchCriteria';
import { ClientTag, ROOT_TAG_ID } from 'src/entities/Tag';
import { Collapse } from 'src/frontend/components/Collapse';
import { TagMerge, TagRemoval } from 'src/frontend/components/RemovalAlert';
import { useStore } from 'src/frontend/contexts/StoreContext';
import { DnDAttribute, DnDTagType, useTagDnD } from 'src/frontend/contexts/TagDnDContext';
import { useAction } from 'src/frontend/hooks/useAction';
import useContextMenu from 'src/frontend/hooks/useContextMenu';
import TagStore from 'src/frontend/stores/TagStore';
import UiStore from 'src/frontend/stores/UiStore';
import { formatTagCountText } from 'src/frontend/utils';
import { IconSet, Tree } from 'widgets';
import { ContextMenu, Toolbar, ToolbarButton } from 'widgets/menus';
import { createBranchOnKeyDown, createLeafOnKeyDown, ITreeItem } from 'widgets/Tree';
import { HOVER_TIME_TO_EXPAND } from '..';
import { TagItemContextMenu } from './ContextMenu';
import TagsTreeStateProvider, { TagsTreeState, useTagsTreeState } from './TagsTreeState';

const TagsTree = observer(() => {
  const { tagStore } = useStore();
  const state = useRef(new TagsTreeState()).current;
  const [contextState, { show, hide }] = useContextMenu();
  const dndData = useTagDnD();

  /** Header and Footer drop zones of the root node */
  const handleDragOverAndLeave = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      if (dndData.source !== undefined) {
        event.preventDefault();
        event.stopPropagation();
      }
    },
    [dndData],
  );

  const [isOpen, setIsOpen] = useState(true);

  const handleDrop = useCallback(() => {
    const isSelected = dndData.source === undefined ? false : tagStore.isSelected(dndData.source);
    if (isSelected) {
      tagStore.moveSelection(ROOT_TAG_ID);
    } else if (dndData.source !== undefined) {
      tagStore.append(dndData.source);
    }
  }, [dndData, tagStore]);

  const toggleBody = useRef(() => setIsOpen((v) => !v));

  return (
    <TagsTreeStateProvider value={state}>
      <Header toggleBody={toggleBody.current} onDrag={handleDragOverAndLeave} onDrop={handleDrop} />

      <Collapse open={isOpen}>
        <Content show={show} />
      </Collapse>

      {/* Used for dragging collection to root of hierarchy and for deselecting tag selection */}
      <div
        id="tree-footer"
        onClick={tagStore.deselectAll}
        onDragOver={handleDragOverAndLeave}
        onDragLeave={handleDragOverAndLeave}
        onDrop={handleDrop}
      />

      {state.deletableNode && (
        <TagRemoval object={state.deletableNode} onClose={state.abortDeletion} />
      )}

      {state.mergableNode && <TagMerge object={state.mergableNode} onClose={state.abortMerge} />}

      <ContextMenu
        isOpen={contextState.open}
        x={contextState.x}
        y={contextState.y}
        close={hide}
        usePortal
      >
        {contextState.menu}
      </ContextMenu>
    </TagsTreeStateProvider>
  );
});

export default TagsTree;

interface HeaderProps {
  toggleBody: () => void;
  onDrag: (event: React.DragEvent<HTMLDivElement>) => void;
  onDrop: () => void;
}

const Header = observer(({ toggleBody, onDrag, onDrop }: HeaderProps) => {
  const { tagStore } = useStore();
  const state = useTagsTreeState();

  const handleRootAddTag = useRef(() =>
    tagStore
      .create('New Tag')
      .then((tag) => state.enableEditing(tag.id))
      .catch((err) => console.log('Could not create tag', err)),
  );

  return (
    <header onDragOver={onDrag} onDragLeave={onDrag} onDrop={onDrop}>
      <h2 onClick={toggleBody}>Tags</h2>
      <Toolbar controls="tag-hierarchy">
        {tagStore.selection.size > 0 ? (
          <ToolbarButton
            showLabel="never"
            icon={IconSet.CLOSE}
            text="Clear"
            onClick={tagStore.deselectAll}
            tooltip="Clear Selection"
          />
        ) : (
          <ToolbarButton
            showLabel="never"
            icon={IconSet.PLUS}
            text="New Tag"
            onClick={handleRootAddTag.current}
            tooltip="Add a new tag"
          />
        )}
      </Toolbar>
    </header>
  );
});

interface ITreeData {
  showContextMenu: (x: number, y: number, menu: JSX.Element) => void;
  state: TagsTreeState;
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
    pos={pos}
    select={treeData.select}
  />
);

/**
 * Toggles Query
 *
 * All it does is remove the query if it already searched, otherwise adds a
 * query. Handling filter mode or replacing the search criteria list is up to
 * the component.
 */
const toggleQuery = (nodeData: ClientTag, uiStore: UiStore, tagStore: TagStore) => {
  if (uiStore.isTagSearched(nodeData)) {
    // if it already exists, then remove it
    const alreadySearchedCrit = uiStore.searchCriteriaList.find((c) =>
      (c as ClientTagSearchCriteria<any>)?.value?.includes(nodeData.id),
    );
    if (alreadySearchedCrit) {
      uiStore.replaceSearchCriterias(
        uiStore.searchCriteriaList.filter((c) => c !== alreadySearchedCrit),
      );
    }
  } else {
    uiStore.addSearchCriteria(new ClientTagSearchCriteria(tagStore, 'tags', nodeData.id));
  }
};

const isExpanded = (nodeData: ClientTag, treeData: ITreeData): boolean =>
  treeData.state.isExpanded(nodeData.id);

const toggleExpansion = (nodeData: ClientTag, treeData: ITreeData) =>
  treeData.state.toggleNode(nodeData.id);

const toggleSelection = (tagStore: TagStore, nodeData: ClientTag) =>
  tagStore.toggleSelection(nodeData);

const triggerContextMenuEvent = (event: React.KeyboardEvent<HTMLLIElement>) => {
  const element = event.currentTarget.querySelector('.tree-content-label');
  if (element) {
    event.stopPropagation();
    const rect = element.getBoundingClientRect();
    element.dispatchEvent(
      new MouseEvent('contextmenu', {
        clientX: rect.right,
        clientY: rect.top,
        bubbles: true,
        cancelable: true,
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
      treeData.state.enableEditing(nodeData.id);
      break;

    case 'F10':
      if (event.shiftKey) {
        triggerContextMenuEvent(event);
      }
      break;

    case 'Enter':
      event.stopPropagation();
      toggleQuery(nodeData, uiStore, tagStore);
      break;

    case 'Delete':
      treeData.state.confirmDeletion(nodeData);
      break;

    case 'ContextMenu':
      triggerContextMenuEvent(event);
      break;

    default:
      break;
  }
};

const mapTag = (tag: Readonly<ClientTag>, tagStore: TagStore): ITreeItem => ({
  id: tag.id,
  label: TagItemLabel,
  children: tag.subTags.map((t) => mapTag(t, tagStore)),
  nodeData: tag,
  isExpanded,
  isSelected: tagStore.isSelected,
});

interface ContentProps {
  show: (x: number, y: number, menu: JSX.Element | JSX.Element[]) => void;
}

const Content = observer(({ show }: ContentProps) => {
  const { tagStore, uiStore } = useStore();
  const state = useTagsTreeState();
  const root = tagStore.root;

  const initialSelectionIndex = useRef<number>();
  /** The last item that is selected in a multi-selection */
  const lastSelectionIndex = useRef<number>();
  // Handles selection via click event
  const select = useAction((e: React.MouseEvent, tag: ClientTag) => {
    // Note: selection logic is copied from Gallery.tsx
    const rangeSelection = e.shiftKey;
    const expandSelection = e.ctrlKey;

    /** The index of the active (newly selected) item */
    let i: number | undefined = tagStore.tagList.indexOf(tag);
    i = i < 0 ? undefined : i;

    // If nothing is selected, initialize the selection range and select that single item
    if (lastSelectionIndex.current === undefined) {
      initialSelectionIndex.current = i;
      lastSelectionIndex.current = i;
      tagStore.toggleSelection(tag);
      return;
    } else {
      initialSelectionIndex.current = lastSelectionIndex.current;
    }

    // Mark this index as the last item that was selected
    lastSelectionIndex.current = i;

    if (rangeSelection && initialSelectionIndex.current !== undefined) {
      if (i === undefined) {
        return;
      }
      if (i < initialSelectionIndex.current) {
        tagStore.selectRange(i, initialSelectionIndex.current, expandSelection);
      } else {
        tagStore.selectRange(initialSelectionIndex.current, i, expandSelection);
      }
    } else if (expandSelection) {
      tagStore.toggleSelection(tag);
      initialSelectionIndex.current = i;
    } else {
      tagStore.select(tag);
      initialSelectionIndex.current = i;
    }
  });

  const treeData: ITreeData = useMemo(
    () => ({
      showContextMenu: show,
      state,
      select: select,
    }),
    [show, state, select],
  );

  const handleBranchOnKeyDown = useRef(
    (event: React.KeyboardEvent<HTMLLIElement>, nodeData: ClientTag, treeData: ITreeData) =>
      createBranchOnKeyDown(
        event,
        nodeData,
        treeData,
        isExpanded,
        toggleSelection.bind(null, tagStore),
        toggleExpansion,
        customKeys.bind(null, uiStore, tagStore),
      ),
  );

  const handleLeafOnKeyDown = useRef(
    (event: React.KeyboardEvent<HTMLLIElement>, nodeData: ClientTag, treeData: ITreeData) =>
      createLeafOnKeyDown(
        event,
        nodeData,
        treeData,
        toggleSelection.bind(null, tagStore),
        customKeys.bind(null, uiStore, tagStore),
      ),
  );

  if (tagStore.isEmpty) {
    return (
      <div className="tree-content-label" style={{ padding: '0.25rem' }}>
        {/* <span className="pre-icon">{IconSet.INFO}</span> */}
        {/* No tags or collections created yet */}
        <i style={{ marginLeft: '1em' }}>None</i>
      </div>
    );
  } else {
    return (
      <Tree
        multiSelect
        id="tag-hierarchy"
        className={tagStore.selection.size > 0 ? 'selected' : undefined}
        children={root.subTags.map((t) => mapTag(t, tagStore))}
        treeData={treeData}
        toggleExpansion={toggleExpansion}
        onBranchKeyDown={handleBranchOnKeyDown.current}
        onLeafKeyDown={handleLeafOnKeyDown.current}
      />
    );
  }
});

interface ITagItemProps {
  showContextMenu: (x: number, y: number, menu: JSX.Element) => void;
  nodeData: ClientTag;
  select: (event: React.MouseEvent, nodeData: ClientTag) => void;
  pos: number;
}

const PreviewTag = document.createElement('span');
PreviewTag.style.position = 'absolute';
PreviewTag.style.top = '-100vh';
document.body.appendChild(PreviewTag);

const TagItem = observer((props: ITagItemProps) => {
  const { nodeData, pos, select, showContextMenu } = props;
  const { uiStore, tagStore } = useStore();
  const state = useTagsTreeState();
  const dndData = useTagDnD();

  const handleContextMenu = useCallback(
    (e: React.MouseEvent) =>
      showContextMenu(e.clientX, e.clientY, <TagItemContextMenu tag={nodeData} pos={pos} />),
    [nodeData, pos, showContextMenu],
  );

  const handleDragStart = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      runInAction(() => {
        let name = nodeData.name;
        if (tagStore.isSelected(nodeData)) {
          const ctx = tagStore.getActiveTags(nodeData.id);
          if (ctx.length === 1) {
            name = ctx[0].name;
          } else {
            const extraText = formatTagCountText(ctx.length);
            if (extraText.length > 0) {
              name += ` (${extraText})`;
            }
          }
        }
        PreviewTag.classList.value = `tag ${uiStore.preferences.theme}`;
        PreviewTag.innerText = name;
        e.dataTransfer.setData(DnDTagType, nodeData.id);
        e.dataTransfer.setDragImage(PreviewTag, 0, 0);
        e.dataTransfer.effectAllowed = 'linkMove';
        e.dataTransfer.dropEffect = 'move';
        e.currentTarget.dataset[DnDAttribute.Source] = 'true';
        dndData.source = nodeData;
      });
    },
    [dndData, nodeData, uiStore, tagStore],
  );

  // Don't expand immediately on drag-over, only after hovering over it for a second or so
  const [expandTimeoutId, setExpandTimeoutId] = useState<number>();
  const expandDelayed = useCallback(
    (nodeId: string) => {
      if (expandTimeoutId) clearTimeout(expandTimeoutId);
      const t = window.setTimeout(() => {
        state.expandNode(nodeId);
      }, HOVER_TIME_TO_EXPAND);
      setExpandTimeoutId(t);
    },
    [expandTimeoutId, state],
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      if (dndData.source === undefined) {
        return;
      }
      const dropTarget = e.currentTarget;
      const isSource = dropTarget.dataset[DnDAttribute.Source] === 'true';
      if (
        isSource ||
        (tagStore.isSelected(dndData.source) && tagStore.isSelected(nodeData)) ||
        tagStore.isAncestor(nodeData, dndData.source)
      ) {
        return;
      }

      e.dataTransfer.dropEffect = 'move';
      e.preventDefault();
      e.stopPropagation();
      dropTarget.dataset[DnDAttribute.Target] = 'true';
      const posY = e.clientY;
      const rect = dropTarget.getBoundingClientRect();
      const [top, bottom] = [rect.top + 8, rect.bottom - 8];
      if (posY <= top) {
        dropTarget.classList.add('top');
        dropTarget.classList.remove('center');
        dropTarget.classList.remove('bottom');
      } else if (posY >= bottom) {
        dropTarget.classList.add('bottom');
        dropTarget.classList.remove('center');
        dropTarget.classList.remove('top');
      } else {
        dropTarget.classList.remove('top');
        dropTarget.classList.add('center');
        dropTarget.classList.remove('bottom');
      }

      // Don't expand when hovering over top/bottom border
      const targetClasses = e.currentTarget.classList;
      if (targetClasses.contains('top') || targetClasses.contains('bottom')) {
        if (expandTimeoutId) {
          clearTimeout(expandTimeoutId);
          setExpandTimeoutId(undefined);
        }
      } else if (!state.isExpanded(nodeData.id) && !expandTimeoutId) {
        expandDelayed(nodeData.id);
      }
    },
    [dndData.source, expandDelayed, expandTimeoutId, nodeData, state, tagStore],
  );

  const handleDragLeave = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      if (dndData.source !== undefined) {
        event.dataTransfer.dropEffect = 'none';
        event.preventDefault();
        event.stopPropagation();
        event.currentTarget.dataset[DnDAttribute.Target] = 'false';
        event.currentTarget.classList.remove('top');
        event.currentTarget.classList.remove('bottom');
        if (expandTimeoutId) {
          clearTimeout(expandTimeoutId);
          setExpandTimeoutId(undefined);
        }
      }
    },
    [dndData, expandTimeoutId],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      runInAction(() => {
        const targetClasses = e.currentTarget.classList;
        // Checker whether to move the dropped tag(s) into or above/below the drop target
        const relativeMovePos = targetClasses.contains('top')
          ? -1
          : targetClasses.contains('bottom')
          ? 0
          : 'middle'; // Not dragged at top or bottom, but in middle

        // Note to self: 'pos' does not start from 0! It is +1'd. So, here we -1 it again
        const isSelected =
          dndData.source === undefined ? false : tagStore.isSelected(dndData.source);
        if (isSelected) {
          if (relativeMovePos === 'middle') {
            tagStore.moveSelection(nodeData.id);
          } else {
            tagStore.moveSelection(tagStore.getParent(nodeData).id, pos + relativeMovePos);
          }
        } else if (dndData.source !== undefined) {
          if (relativeMovePos === 'middle') {
            tagStore.insert(nodeData, dndData.source, 0);
          } else {
            tagStore.insert(tagStore.getParent(nodeData), dndData.source, pos + relativeMovePos);
          }
        }
      });
      e.currentTarget.dataset[DnDAttribute.Target] = 'false';
      e.currentTarget.classList.remove('top');
      e.currentTarget.classList.remove('bottom');
      if (expandTimeoutId) {
        clearTimeout(expandTimeoutId);
        setExpandTimeoutId(undefined);
      }
    },
    [dndData, expandTimeoutId, nodeData, pos, tagStore],
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
        const query = new ClientTagSearchCriteria(tagStore, 'tags', nodeData.id, nodeData.name);
        if (event.ctrlKey) {
          if (!uiStore.isTagSearched(nodeData)) {
            uiStore.addSearchCriteria(query);
          }
        } else {
          uiStore.replaceSearchCriteria(query);
        }
      });
    },
    [nodeData, tagStore, uiStore],
  );

  const handleRename = useCallback(() => state.enableEditing(nodeData.id), [state, nodeData.id]);

  const isEditing = state.editableNode === nodeData.id;

  return (
    <div
      className="tree-content-label"
      draggable={!isEditing}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onContextMenu={handleContextMenu}
      onClick={handleQuickQuery}
      onDoubleClick={handleRename}
    >
      <span style={{ color: nodeData.viewColor }}>{IconSet.TAG}</span>
      {isEditing ? <EditableName tag={nodeData} /> : <div>{nodeData.name}</div>}
      {!isEditing && (
        <button onClick={handleSelect} className="btn btn-icon">
          {tagStore.selection.has(nodeData) ? IconSet.SELECT_CHECKED : IconSet.SELECT}
        </button>
      )}
    </div>
  );
});

const EditableName = observer(({ tag }: { tag: ClientTag }) => {
  const state = useTagsTreeState();

  const submit = useRef((target: EventTarget & HTMLInputElement) => {
    target.focus();
    state.disableEditing();
    target.setSelectionRange(0, 0);
  }).current;

  return (
    <input
      className="input"
      autoFocus
      type="text"
      placeholder="Enter a new name"
      defaultValue={tag.name}
      onBlur={(e) => {
        const value = e.currentTarget.value.trim();
        if (value.length > 0) {
          tag.rename(value);
        }
        submit(e.currentTarget);
      }}
      onKeyDown={(e) => {
        const value = e.currentTarget.value.trim();
        if (e.key === 'Enter' && value.length > 0) {
          tag.rename(value);
          submit(e.currentTarget);
        } else if (e.key === 'Escape') {
          submit(e.currentTarget); // cancel with escape
        }
      }}
      onFocus={(e) => e.target.select()}
      // TODO: Visualizing errors...
      // Only show red outline when input field is in focus and text is invalid
    />
  );
});
