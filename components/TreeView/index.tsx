/* eslint-disable @typescript-eslint/no-non-null-assertion */
import style from './treeview.module.scss';
import React, {
  useCallback,
  useEffect,
  useRef,
  useLayoutEffect,
  useMemo,
  CSSProperties,
} from 'react';
import { observer } from 'mobx-react-lite';
import { ID } from '../../src/renderer/entities/ID';

// --- Helper function for tree items ---

const setTabFocus = (element: HTMLElement) => {
  element.setAttribute('tabIndex', '0');
  element.focus();
};

export const refocus = (previousTarget: HTMLElement, nextTarget: HTMLElement) => {
  previousTarget.setAttribute('tabIndex', '-1');
  setTabFocus(nextTarget);
};

export const isTreeItem = (element: Element) => element?.getAttribute('role') === 'treeitem';

export const isGroup = (element: Element | null) => element?.getAttribute('role') === 'group';

export const isExpanded = (element: Element) => element?.getAttribute('aria-expanded') === 'true';

export const getParent = (element: Element): HTMLElement | null =>
  isGroup(element.parentElement) ? element.parentElement!.parentElement!.parentElement : null;

export const getFirstChild = (element: Element): Element | null =>
  isExpanded(element) && isGroup(element.lastElementChild!.lastElementChild)
    ? element.lastElementChild!.lastElementChild!.firstElementChild
    : null;

export const getLastDescendant = (element: Element): Element | null => {
  if (isExpanded(element) && isGroup(element.lastElementChild!.lastElementChild)) {
    const last = element.lastElementChild!.lastElementChild!.lastElementChild;
    if (last) {
      return getLastDescendant(last);
    }
  }
  return element;
};

export const getNextSibling = (element: Element): Element | null => {
  if (!element.nextElementSibling) {
    const parent = getParent(element);
    if (parent) {
      return getNextSibling(parent);
    }
  }
  return element.nextElementSibling;
};

// --- Keyboard Interaction ---

type KeyDownEventHandler = (
  event: React.KeyboardEvent<HTMLLIElement>,
  id: ID,
  nodeData: any,
  treeData: any,
) => void;

const KeyboardSpaceEvent = new KeyboardEvent('keydown', { key: ' ', bubbles: true, repeat: false });

const shiftKeyFocus = (shiftKey: boolean, current: HTMLElement | null, target: HTMLElement) => {
  if (current) {
    if (shiftKey) {
      current.dispatchEvent(KeyboardSpaceEvent);
    }
    refocus(target, current);
  }
};

const keyFocus = (current: HTMLElement | null, target: HTMLElement) => {
  if (current) {
    refocus(target, current);
  }
};

export const createLeafOnKeyDown = (
  event: React.KeyboardEvent<HTMLLIElement>,
  id: ID,
  nodeData: any,
  treeData: any,
  toggleSelection: (id: ID, nodeData: any, treeData: any) => void,
  onKeyDown?: KeyDownEventHandler,
) => {
  if (event.target !== event.currentTarget) {
    return;
  }
  const leaf = event.target as HTMLElement;
  switch (event.key) {
    case ' ':
      event.stopPropagation();
      toggleSelection(id, nodeData, treeData);
      break;

    case 'ArrowDown':
      event.stopPropagation();
      shiftKeyFocus(event.shiftKey, getNextSibling(leaf) as HTMLElement, leaf);
      break;

    case 'ArrowUp': {
      event.stopPropagation();
      const prev = leaf.previousElementSibling
        ? getLastDescendant(leaf.previousElementSibling)
        : getParent(leaf);
      shiftKeyFocus(event.shiftKey, prev as HTMLElement, leaf);
      break;
    }

    case 'ArrowLeft':
      event.stopPropagation();
      keyFocus(getParent(leaf), leaf);
      break;

    default:
      onKeyDown?.(event, id, nodeData, treeData);
      break;
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
      keyFocus(event.currentTarget.firstElementChild as HTMLElement, target);
      break;

    case 'End':
      event.stopPropagation();
      keyFocus(target, event.currentTarget.lastElementChild as HTMLElement);
      break;

    default:
      break;
  }
};

export const createBranchOnKeyDown = (
  event: React.KeyboardEvent<HTMLLIElement>,
  id: ID,
  nodeData: any,
  treeData: any,
  isExpanded: (id: ID, nodeData: any, treeData: any) => boolean,
  toggleSelection: (id: ID, nodeData: any, treeData: any) => void,
  toggleExpansion: (id: ID, nodeData: any, treeData: any) => void,
  onKeyDown?: KeyDownEventHandler,
) => {
  if (event.target !== event.currentTarget) {
    return;
  }
  const branch = event.currentTarget;
  switch (event.key) {
    case ' ':
      event.stopPropagation();
      toggleSelection(id, nodeData, treeData);
      break;
    case 'ArrowDown': {
      event.stopPropagation();
      const next = getFirstChild(branch) ?? getNextSibling(branch);
      shiftKeyFocus(event.shiftKey, next as HTMLElement, branch);
      break;
    }

    case 'ArrowUp': {
      event.stopPropagation();
      const prev = branch.previousElementSibling
        ? getLastDescendant(branch.previousElementSibling)
        : getParent(branch);
      shiftKeyFocus(event.shiftKey, prev as HTMLElement, branch);
      break;
    }

    case 'ArrowRight':
      event.stopPropagation();
      if (isExpanded(id, nodeData, treeData)) {
        keyFocus(getFirstChild(branch) as HTMLElement, branch);
      } else {
        toggleExpansion(id, nodeData, treeData);
      }
      break;

    case 'ArrowLeft':
      event.stopPropagation();
      if (isExpanded(id, nodeData, treeData)) {
        toggleExpansion(id, nodeData, treeData);
      } else {
        keyFocus(getParent(branch), branch);
      }
      break;

    default:
      onKeyDown?.(event, id, nodeData, treeData);
      break;
  }
};

// --- Low Level Interface --

/** Representation of Node Data */
interface INodeData {
  /** A unique key identifier */
  id: ID;
  /** Pointer to addionally related data */
  nodeData: any;
  /**
   * Checks the selection state of a node
   *
   * Returning true or false determines the selection state of a node. If the
   * tree has only single selection, undefined should be returned for
   * unselected nodes.
   * */
  isSelected?: (id: ID, nodeData: any, treeData: any) => boolean;
}

/** Internal Node Representation */
interface ITreeNode extends INodeData {
  className?: string;
  label: JSX.Element | string;
  level: number;
  size: number;
  pos: number;
  treeData: any;
  onKeyDown: KeyDownEventHandler;
}

type ILeaf = ITreeNode;

interface IBranch extends ITreeNode {
  isExpanded: (id: ID, nodeData: any, treeData: any) => boolean;
  toggleExpansion: (id: ID, nodeData: any, treeData: any) => void;
  branches: ITreeBranch[];
  leaves: ITreeLeaf[];
}

const Leaf = ({
  id,
  label,
  isSelected,
  level,
  size,
  pos,
  nodeData,
  treeData,
  onKeyDown,
  className = '',
}: ILeaf) => {
  const handleOnKeyDown = useCallback((e) => onKeyDown(e, id, nodeData, treeData), [
    onKeyDown,
    id,
    nodeData,
    treeData,
  ]);

  return (
    <li
      className={`${className} ${style.tree_item}`}
      aria-level={level}
      aria-setsize={size}
      aria-posinset={pos}
      aria-selected={isSelected?.(id, nodeData, treeData)}
      onKeyDown={handleOnKeyDown}
      role="treeitem"
      tabIndex={-1}
    >
      <div className={style.label}>{label}</div>
    </li>
  );
};

const TreeLeaf = observer(Leaf);

const resizeObserver = new ResizeObserver((entries) => {
  for (const entry of entries) {
    const container = (entry.target as HTMLElement).parentElement;
    if (container) {
      container.style.maxHeight = entry.contentRect.height + 'px';
    }
  }
});

const Branch = ({
  id,
  branches,
  leaves,
  label,
  level,
  size,
  pos,
  nodeData,
  isExpanded,
  treeData,
  isSelected,
  toggleExpansion,
  onKeyDown,
  className = '',
}: IBranch) => {
  const group = useRef<HTMLUListElement | null>(null);
  const expanded = useMemo(() => isExpanded(id, nodeData, treeData) ?? false, [
    id,
    isExpanded,
    nodeData,
    treeData,
  ]);
  useLayoutEffect(() => {
    const node = group.current;
    if (node) {
      if (expanded) {
        resizeObserver.observe(node);
      } else {
        // This is probably more performant but if the animation gets janky, this line should be removed.
        resizeObserver.unobserve(node);
        node.parentElement!.style.maxHeight = '0px';
      }
    }

    return () => {
      if (node) {
        resizeObserver.unobserve(node);
      }
    };
  }, [expanded]);

  const handleToggle = useCallback(() => toggleExpansion(id, nodeData, treeData), [
    toggleExpansion,
    id,
    nodeData,
    treeData,
  ]);

  const handleOnKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLLIElement>) => onKeyDown(event, id, nodeData, treeData),
    [onKeyDown, id, nodeData, treeData],
  );

  return (
    <li
      className={`${className} ${style.tree_item}`}
      role="treeitem"
      tabIndex={-1}
      aria-expanded={expanded}
      aria-selected={isSelected?.(id, nodeData, treeData)}
      aria-level={level}
      aria-setsize={size}
      aria-posinset={pos}
      onKeyDown={handleOnKeyDown}
    >
      <div className={style.label}>
        <div
          className={style.default_caret}
          aria-pressed={expanded}
          aria-label="Expand"
          onClick={handleToggle}
        />
        {label}
      </div>
      <div className={style.group_transition} style={{ maxHeight: expanded ? undefined : 0 }}>
        {(branches.length > 0 || leaves.length > 0) && (
          <ul
            style={{ '--level': level } as React.CSSProperties}
            className={style.group}
            role="group"
            ref={group}
          >
            {branches.map((b, i) => (
              <TreeBranch
                {...b}
                key={b.id}
                level={level + 1}
                size={branches.length + leaves.length}
                pos={i + 1}
                toggleExpansion={toggleExpansion}
                onKeyDown={onKeyDown}
                treeData={treeData}
              />
            ))}
            {leaves.map((l, i) => (
              <TreeLeaf
                {...l}
                key={l.id}
                level={level + 1}
                size={branches.length + leaves.length}
                pos={branches.length + i + 1}
                onKeyDown={onKeyDown}
                treeData={treeData}
              />
            ))}
          </ul>
        )}
      </div>
    </li>
  );
};

const TreeBranch = observer(Branch);

// --- Public API ---

export interface ITree {
  /** Element id of the tree view used for the aria-labelledby attribute */
  labelledBy?: string;
  /** Sets the aria-multiselectable attribute */
  multiSelect?: boolean;
  /** CSS class passed to the tree container element */
  className?: string;
  /** Expandable nodes */
  branches: ITreeBranch[];
  /** Non-expandable nodes */
  leaves: ITreeLeaf[];
  /** Toggles the expansion of a parent node */
  toggleExpansion: (id: ID, nodeData: any, treeData: any) => void;
  /**
   * `onKeyDown` Event Handler
   *
   * Trees are unique components which makes it harder to have a good default
   * for keyboard navigation. However, that can be more work if only basic
   * support is required which is why factory functions (see
   * `createBranchOnKeyDown` and `createLeafOnKeyDown`) are provided. Those
   * take an optional parameter, so other keys can be handled.
   * */
  onKeyDown: KeyDownEventHandler;
  /**
   * Pointer to external data
   *
   * This can be thought of similar to the `nodeData` props as a simple void
   * pointer like in the C programming language. This pointer is then casted to
   * its actual type and then used. TypeScript generics and React components do
   * not mesh well, which is why this kind of API exists.
   *
   * In this pointer you can store any kind of data that is then passed to the
   * internal components and visible as parameters in callback function. This
   * avoids excessive memoization attempts of dispatch functions and recreating
   * the tree structure from scratch. However, it is easier to mess up things.
   * As a tip, callbacks can use interfaces instead of `any` for `nodeData` and
   * `treeData` without TypeScript complaining.
   *
   * Furthermore, not only (observable) state but also setters/dispatchers can
   * be passed instead of memoized functions and accessed instead inside the
   * provided callbacks. This is in combination with the `useReducer` hook very powerfuls.
   */
  treeData: any; // e.g. { state, dispatch }
}

/** Presentation for leaf nodes */
export interface ITreeLeaf extends INodeData {
  /** Actual rendered label */
  label: JSX.Element | string; // (id: ID, level: number, size: number, pos: number, nodeData: any) => JSX.Element | string
  /** CSS class added to a tree item */
  className?: string;
}

/** Presentation for branch nodes */
export interface ITreeBranch extends ITreeLeaf {
  /** Expandable child nodes */
  branches: ITreeBranch[];
  /** Non-expandable child nodes */
  leaves: ITreeLeaf[];
  /** Checks whether a parent node is open or closed */
  isExpanded: (id: ID, nodeData: any, treeData: any) => boolean;
}

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

const Tree = ({
  className = '',
  multiSelect,
  labelledBy,
  branches,
  leaves,
  treeData,
  onKeyDown,
  toggleExpansion,
}: ITree) => {
  const tree = useRef<HTMLUListElement | null>(null);

  useEffect(() => {
    if (tree.current?.firstElementChild) {
      setTabFocus(tree.current.firstElementChild as HTMLElement);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branches.length > 0 || leaves.length > 0]);

  return (
    <ul
      style={{ '--level': 0 } as CSSProperties}
      className={`${style.tree} ${className}`}
      ref={tree}
      role="tree"
      aria-labelledby={labelledBy}
      aria-multiselectable={multiSelect}
      onKeyDown={handleTreeKeyDown}
      onFocus={handleOnFocus}
    >
      {branches.map((b, i) => (
        <TreeBranch
          {...b}
          key={b.id}
          level={1}
          size={branches.length + leaves.length}
          pos={i + 1}
          onKeyDown={onKeyDown}
          toggleExpansion={toggleExpansion}
          treeData={treeData}
        />
      ))}
      {leaves.map((l, i) => (
        <TreeLeaf
          {...l}
          key={l.id}
          level={1}
          size={branches.length + leaves.length}
          pos={branches.length + i + 1}
          onKeyDown={onKeyDown}
          treeData={treeData}
        />
      ))}
    </ul>
  );
};

export default Tree;
