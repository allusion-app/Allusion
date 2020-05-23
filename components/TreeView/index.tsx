import style from './treeview.module.scss';
import React, { useCallback, useReducer, useEffect, useRef, useLayoutEffect } from 'react';

// # Omitting Dispatch Function and ID
// 'React guarantees that dispatch function identity is stable and won’t change
// on re-renders. This is why it’s safe to omit from the useEffect or
// useCallback dependency list.' (https://reactjs.org/docs/hooks-reference.html#usereducer)
// The id prop is used for the key, so it would recreate the node and the function too.

// --- Helper function for tree items ---

const setTabFocus = (element: HTMLElement) => {
  element.setAttribute('tabIndex', '0');
  element.focus();
};

const refocus = (previousTarget: HTMLElement, nextTarget: HTMLElement) => {
  previousTarget.setAttribute('tabIndex', '-1');
  setTabFocus(nextTarget);
};

const isTreeItem = (element: Element) => element?.getAttribute('role') === 'treeitem';

const isGroup = (element: Element | null) => element?.getAttribute('role') === 'group';

const isExpanded = (element: Element) => element?.getAttribute('aria-expanded') === 'true';

const getParent = (element: Element): HTMLElement | null =>
  isGroup(element.parentElement) ? element.parentElement!.parentElement!.parentElement : null;

const getFirstChild = (element: Element): Element | null =>
  isExpanded(element) && isGroup(element.lastElementChild!.lastElementChild)
    ? element.lastElementChild!.lastElementChild!.firstElementChild
    : null;

const getLastChild = (element: Element): Element | null =>
  isExpanded(element) && isGroup(element.lastElementChild!.lastElementChild)
    ? element.lastElementChild!.lastElementChild!.lastElementChild
    : null;

const KeyboardSpaceEvent = new KeyboardEvent('keydown', { key: ' ', bubbles: true, repeat: false });

// --- Low Level API ---
type TreeViewDispatch = React.Dispatch<ITreeViewAction>;

interface ITreeNode {
  id: ID;
  label: JSX.Element | string;
  dispatch: TreeViewDispatch;
  level: number;
  size: number;
  pos: number;
}

interface ILeaf extends ITreeNode {
  isSelected: boolean;
}

interface IBranch extends ITreeNode, ITreeViewState {
  branches: ITreeViewBranch[];
  leaves: ITreeViewLeaf[];
}

const leafOnKeyDown = (
  event: React.KeyboardEvent<HTMLElement>,
  dispatch: TreeViewDispatch,
  id: ID
) => {
  if (event.target !== event.currentTarget) {
    return;
  }
  const leaf = event.target as HTMLElement;
  switch (event.key) {
    case ' ':
      event.stopPropagation();
      dispatch({ type: 'toggleSelection', id });
      break;
    case 'ArrowDown': {
      event.stopPropagation();
      const next = leaf.nextElementSibling ?? getParent(leaf)?.nextElementSibling;
      if (next) {
        if (event.shiftKey) {
          next.dispatchEvent(KeyboardSpaceEvent);
        }
        refocus(leaf, next as HTMLElement);
      }
      break;
    }

    case 'ArrowUp': {
      event.stopPropagation();
      const prev = leaf.previousElementSibling
        ? getLastChild(leaf.previousElementSibling) ?? leaf.previousElementSibling
        : getParent(leaf);
      if (prev) {
        if (event.shiftKey) {
          prev.dispatchEvent(KeyboardSpaceEvent);
        }
        refocus(leaf, prev as HTMLElement);
      }
      break;
    }

    case 'ArrowLeft': {
      event.stopPropagation();
      const parent = getParent(leaf);
      if (parent) {
        refocus(leaf, parent);
      }
      break;
    }

    default:
      break;
  }
};

const Leaf = ({ id, label, dispatch, isSelected, level, size, pos }: ILeaf) => {
  // See note 'Omitting Dispatch Function and ID' at the top.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const handleOnKeyDown = useCallback((e) => leafOnKeyDown(e, dispatch, id), []);

  return (
    <li
      className={style.tree_item}
      aria-level={level}
      aria-setsize={size}
      aria-posinset={pos}
      aria-selected={isSelected}
      style={{ '--level': level } as React.CSSProperties}
      onKeyDown={handleOnKeyDown}
      role="treeitem"
      tabIndex={-1}
    >
      <div className={style.label}>{label}</div>
    </li>
  );
};

const TreeLeaf = React.memo(Leaf);

const resizeObserver = new ResizeObserver((entries) => {
  for (const entry of entries) {
    (entry.target as HTMLElement).parentElement!.style.height = `${entry.contentRect.height}px`;
  }
});

const toggleExpansion = (dispatch: TreeViewDispatch, id: ID) => dispatch({type: 'toggleExpansion', id});

const branchOnKeyDown = (
  event: React.KeyboardEvent<HTMLLIElement>,
  dispatch: TreeViewDispatch,
  id: ID,
  isExpanded: boolean
) => {
  if (event.target !== event.currentTarget) {
    return;
  }
  const branch = event.currentTarget;
  switch (event.key) {
    case ' ':
      event.stopPropagation();
      dispatch({ type: 'toggleSelection', id });
      break;
    case 'ArrowDown': {
      event.stopPropagation();
      const next = getFirstChild(branch) ?? branch.nextElementSibling;
      if (next) {
        refocus(branch, next as HTMLElement);
        if (event.shiftKey) {
          event.preventDefault();
          next.dispatchEvent(KeyboardSpaceEvent);
        }
      }
      break;
    }

    case 'ArrowUp': {
      event.stopPropagation();
      const prev = branch.previousElementSibling
        ? getLastChild(branch.previousElementSibling) ?? branch.previousElementSibling
        : getParent(branch);
      if (prev) {
        refocus(branch, prev as HTMLElement);
        if (event.shiftKey) {
          prev.dispatchEvent(KeyboardSpaceEvent);
        }
      }
      break;
    }

    case 'ArrowRight':
      event.stopPropagation();
      if (isExpanded) {
        const firstChild = getFirstChild(branch);
        if (firstChild) {
          refocus(branch, firstChild as HTMLElement);
        }
      } else {
        dispatch({ type: 'toggleExpansion', id });
      }
      break;

    case 'ArrowLeft':
      event.stopPropagation();
      if (isExpanded) {
        dispatch({ type: 'toggleExpansion', id });
      } else {
        const parent = getParent(branch);
        if (parent) {
          refocus(branch, parent);
        }
      }
      break;

    case 'Enter':
      event.stopPropagation();
      dispatch({ type: 'toggleExpansion', id });
      break;

    default:
      break;
  }
};

const Branch = ({
  id,
  branches,
  leaves,
  expansion,
  selection,
  label,
  dispatch,
  level,
  size,
  pos
}: IBranch) => {
  const group = useRef<HTMLUListElement | null>(null);
  useLayoutEffect(() => {
    const node = group.current;
    if (node) {
      if (expansion[id]) {
        resizeObserver.observe(node);
      } else {
        resizeObserver.unobserve(node);
        node.parentElement!.style.height = '0px';
      }
    }

    return () => {
      if (node) {
        resizeObserver.unobserve(node);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expansion[id]]); // The id really never changes and we are only interested into the value.

  // See note 'Omitting Dispatch Function and ID' at the top.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const handleToggle = useCallback(() => toggleExpansion(dispatch, id), []);

  const handleOnKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLLIElement>) =>
      branchOnKeyDown(event, dispatch, id, expansion[id]),
    // See note 'Omitting Dispatch Function and ID' at the top.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [expansion[id]]
  );

  return (
    <li
      className={style.tree_item}
      role="treeitem"
      tabIndex={-1}
      aria-expanded={expansion[id] ?? false}
      aria-selected={selection[id] ?? false}
      aria-level={level}
      aria-setsize={size}
      aria-posinset={pos}
      style={{ '--level': level } as React.CSSProperties}
      onKeyDown={handleOnKeyDown}
    >
      <div className={style.label}>
        <div
          className={style.default_caret}
          aria-pressed={expansion[id] ?? false}
          aria-label="Expand"
          onClick={handleToggle}
        />
        {label}
      </div>
      <div className={style.group_transition}>
        {(branches.length > 0 || leaves.length > 0) && (
          <ul className={style.group} role="group" ref={group}>
            {branches.map((b, i) => (
              <TreeBranch
                key={b.id}
                id={b.id}
                label={b.label}
                dispatch={dispatch}
                level={level + 1}
                size={branches.length + leaves.length}
                pos={i + 1}
                expansion={expansion}
                selection={selection}
                branches={b.branches}
                leaves={b.leaves}
              />
            ))}
            {leaves.map((l, i) => (
              <TreeLeaf
                key={l.id}
                id={l.id}
                label={l.label}
                dispatch={dispatch}
                level={level + 1}
                size={branches.length + leaves.length}
                pos={branches.length + i + 1}
                isSelected={selection[l.id] ?? false}
              />
            ))}
          </ul>
        )}
      </div>
    </li>
  );
};

const TreeBranch = React.memo(Branch);

// --- Public API ---

export type ID = string;

/** Map that keeps track of the IDs that are expanded */
type IExpansionState = { [key: string]: boolean };
/** Map that keeps track of the IDs that are selected */
export type ISelectionState = { [key: string]: boolean };

export interface ITreeView {
  /** The id of the label element of the tree view used for the aria-labelledby attribute. */
  labelledBy?: string;
  /** The expand state of every tree node at render start. */
  initialExpansionState?: IExpansionState;
  /** The section state of every tree node at render start. */
  initialSelection?: ISelectionState;
  /** Expandable nodes */
  branches: ITreeViewBranch[];
  /** Non-expandable nodes */
  leaves: ITreeViewLeaf[];
}

export interface ITreeViewLeaf {
  /** Unique key for rendered nodes. */
  id: ID;
  /** Actual rendered label. */
  label: JSX.Element | string;
}

export interface ITreeViewBranch extends ITreeViewLeaf {
  /** Expandable child nodes */
  branches: ITreeViewBranch[];
  /** Non-expandable child nodes */
  leaves: ITreeViewLeaf[];
}

interface ITreeViewAction {
  type: 'toggleExpansion' | 'toggleSelection';
  id: ID;
}

interface ITreeViewState {
  expansion: IExpansionState;
  selection: ISelectionState;
}

const treeReducer = (state: ITreeViewState, action: ITreeViewAction): ITreeViewState => {
  switch (action.type) {
    case 'toggleExpansion':
      return {
        ...state,
        expansion: { ...state.expansion, [action.id]: !state.expansion[action.id] }
      };

    case 'toggleSelection':
      return {
        ...state,
        selection: { ...state.selection, [action.id]: !state.selection[action.id] }
      };

    default:
      return state;
  }
};

// React's 'focus' event actually bubbles, so it is closer to 'focusIn'.
const handleOnFocus = (event: React.FocusEvent<HTMLUListElement>) => {
  if (!isTreeItem(event.target)) {
    return;
  }
  const prev = event.currentTarget.querySelector('li[role="treeitem"][tabindex="0"]');
  if (prev) {
    if (event.target !== prev) {
      refocus(prev as HTMLElement, event.target);
    }
  } else {
    setTabFocus(event.target);
  }
};

const handleTreeKeyDown = (event: React.KeyboardEvent<HTMLUListElement>) => {
  if (!isTreeItem(event.target as Element)) {
    return;
  }
  const target = event.target as HTMLElement;
  switch (event.key) {
    case 'Home':
      event.stopPropagation();
      if (event.currentTarget.firstElementChild) {
        refocus(target, event.currentTarget.firstElementChild as HTMLElement);
      }
      break;

    case 'End':
      event.stopPropagation();
      if (event.currentTarget.lastElementChild) {
        refocus(target, event.currentTarget.lastElementChild as HTMLElement);
      }
      break;

    default:
      break;
  }
};

const TreeView = ({
  labelledBy,
  branches,
  leaves,
  initialExpansionState = {},
  initialSelection = {}
}: ITreeView) => {
  const tree = useRef<HTMLUListElement | null>(null);
  const [{ expansion, selection }, dispatch] = useReducer(treeReducer, {
    expansion: initialExpansionState,
    selection: initialSelection
  });

  useEffect(() => {
    if (tree.current?.firstElementChild) {
      setTabFocus(tree.current.firstElementChild as HTMLElement);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branches.length > 0 || leaves.length > 0]);

  if (branches.length === 0 && leaves.length) {
    return <ul role="tree" aria-labelledby={labelledBy}></ul>;
  }

  return (
    <ul
      className={style.tree}
      ref={tree}
      role="tree"
      aria-labelledby={labelledBy}
      aria-multiselectable
      onKeyDown={handleTreeKeyDown}
      onFocus={handleOnFocus}
    >
      {branches.map((b, i) => (
        <TreeBranch
          key={b.id}
          id={b.id}
          label={b.label}
          dispatch={dispatch}
          level={1}
          size={branches.length + leaves.length}
          pos={i + 1}
          expansion={expansion}
          selection={selection}
          branches={b.branches}
          leaves={b.leaves}
        />
      ))}
      {leaves.map((l, i) => (
        <TreeLeaf
          key={l.id}
          id={l.id}
          label={l.label}
          dispatch={dispatch}
          level={1}
          size={branches.length + leaves.length}
          pos={branches.length + i + 1}
          isSelected={selection[l.id] ?? false}
        />
      ))}
    </ul>
  );
};

export default TreeView;
