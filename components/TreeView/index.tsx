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

const refocus = (previousTarget: Element, nextTarget: HTMLElement) => {
  previousTarget.setAttribute('tabIndex', '-1');
  setTabFocus(nextTarget);
};

const isGroup = (element: Element | null) => element?.getAttribute('role') === 'group';

const isExpanded = (element: Element | null) => element?.getAttribute('aria-expanded') === 'true';

const getParent = (element: Element): HTMLElement | null =>
  isGroup(element.parentElement) ? element.parentElement!.parentElement!.parentElement : null;

const getFirstChild = (element: Element): Element | null =>
  isExpanded(element) && isGroup(element.lastElementChild!.lastElementChild)
    ? element.lastElementChild!.lastElementChild!.firstElementChild
    : null;

const getLastDescendant = (element: Element): Element | null => {
  if (isExpanded(element) && isGroup(element.lastElementChild!.lastElementChild)) {
    const last = element.lastElementChild!.lastElementChild!.lastElementChild;
    if (last) {
      return getLastDescendant(last);
    }
  }
  return element;
};

const getNextSibling = (element: Element): Element | null => {
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
  nodeData: any,
  treeData: any,
) => void;

const KeyboardSpaceEvent = new KeyboardEvent('keydown', { key: ' ', bubbles: true, repeat: false });

const shiftKeyFocus = (shiftKey: boolean, current: HTMLElement | null, target: Element) => {
  if (current) {
    if (shiftKey) {
      current.dispatchEvent(KeyboardSpaceEvent);
    }
    refocus(target, current);
  }
};

const keyFocus = (current: HTMLElement | null, target: Element) => {
  if (current) {
    refocus(target, current);
  }
};

/**
 * Function factory handling keyDown event on leaves
 *
 * The event is ONLY triggered when a tree item is focused. If you need other
 * behaviour, you should write the key event handler from scratch. This might
 * seem restrictive but prevents text input accidentially triggering events.
 */
export const createLeafOnKeyDown = (
  event: React.KeyboardEvent<HTMLLIElement>,
  nodeData: any,
  treeData: any,
  toggleSelection: (nodeData: any, treeData: any) => void,
  onKeyDown?: KeyDownEventHandler,
) => {
  // We only want to trigger those events when the tree item is focused!
  if (event.currentTarget !== event.target) {
    return;
  }
  const leaf = event.currentTarget;
  switch (event.key) {
    case ' ':
      event.stopPropagation();
      toggleSelection(nodeData, treeData);
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
      onKeyDown?.(event, nodeData, treeData);
      break;
  }
};

const handleTreeKeyDown = (event: React.KeyboardEvent<HTMLUListElement>) => {
  if (event.target instanceof Element && event.target.getAttribute('role') !== 'treeitem') {
    return;
  }
  switch (event.key) {
    case 'Home': {
      const prev = event.currentTarget.querySelector('li[role="treeitem"][tabindex="0"]');
      setTabFocus(event.currentTarget.firstElementChild as HTMLElement);
      if (prev) {
        prev.setAttribute('tabIndex', '-1');
      }
      break;
    }

    case 'End': {
      const prev = event.currentTarget.querySelector('li[role="treeitem"][tabindex="0"]');
      setTabFocus(event.currentTarget.lastElementChild as HTMLElement);
      if (prev) {
        prev.setAttribute('tabIndex', '-1');
      }
      break;
    }

    default:
      break;
  }
};

/**
 * Function factory handling keyDown event on branches
 *
 * The event is ONLY triggered when a tree item is focused. If you need other
 * behaviour, you should write the key event handler from scratch. This might
 * seem restrictive but prevents text input accidentially triggering events.
 */
export const createBranchOnKeyDown = (
  event: React.KeyboardEvent<HTMLLIElement>,
  nodeData: any,
  treeData: any,
  isExpanded: (nodeData: any, treeData: any) => boolean,
  toggleSelection: (nodeData: any, treeData: any) => void,
  toggleExpansion: (nodeData: any, treeData: any) => void,
  onKeyDown?: KeyDownEventHandler,
) => {
  // We only want to trigger those events when the tree item is focused!
  if (event.currentTarget !== event.target) {
    return;
  }
  const branch = event.currentTarget;
  switch (event.key) {
    case ' ':
      event.stopPropagation();
      toggleSelection(nodeData, treeData);
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
      if (isExpanded(nodeData, treeData)) {
        keyFocus(getFirstChild(branch) as HTMLElement, branch);
      } else {
        toggleExpansion(nodeData, treeData);
      }
      break;

    case 'ArrowLeft':
      event.stopPropagation();
      if (isExpanded(nodeData, treeData)) {
        toggleExpansion(nodeData, treeData);
      } else {
        keyFocus(getParent(branch), branch);
      }
      break;

    default:
      onKeyDown?.(event, nodeData, treeData);
      break;
  }
};

// --- Low Level Interface --

/** Representation of Node Data */
export interface INodeData {
  /** A unique key identifier used as the key value for React components */
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
  isSelected?: (nodeData: any, treeData: any) => boolean;
}

/** Internal Node Representation */
interface ITreeNode extends INodeData {
  className?: string;
  label: TreeLabel;
  level: number;
  size: number;
  pos: number;
  treeData: any;
  onLeafKeyDown: KeyDownEventHandler;
}

type ILeaf = ITreeNode;

interface IBranch extends ITreeNode {
  isExpanded: (nodeData: any, treeData: any) => boolean;
  toggleExpansion: (nodeData: any, treeData: any) => void;
  branches: ITreeBranch[];
  leaves: ITreeLeaf[];
  onBranchKeyDown: KeyDownEventHandler;
}

const TreeLeaf = observer(
  ({
    label: Label,
    isSelected,
    level,
    size,
    pos,
    nodeData,
    treeData,
    onLeafKeyDown,
    className = '',
  }: ILeaf) => {
    const handleKeyDown = useCallback((e) => onLeafKeyDown(e, nodeData, treeData), [
      onLeafKeyDown,
      nodeData,
      treeData,
    ]);

    return (
      <li
        className={`${className} ${style.tree_item}`}
        aria-level={level}
        aria-setsize={size}
        aria-posinset={pos}
        aria-selected={isSelected?.(nodeData, treeData)}
        onKeyDown={handleKeyDown}
        role="treeitem"
        tabIndex={-1}
      >
        <div className={style.label}>
          {typeof Label === 'string' ? Label : Label(nodeData, treeData, level, size, pos)}
        </div>
      </li>
    );
  },
);

const resizeObserver = new ResizeObserver((entries) => {
  for (const entry of entries) {
    const container = (entry.target as HTMLElement).parentElement;
    if (container) {
      container.style.maxHeight = entry.contentRect.height + 'px';
    }
  }
});

const TreeBranch = observer(
  ({
    branches,
    leaves,
    label: Label,
    level,
    size,
    pos,
    nodeData,
    treeData,
    isExpanded,
    isSelected,
    toggleExpansion,
    onBranchKeyDown,
    onLeafKeyDown,
    className = '',
  }: IBranch) => {
    const group = useRef<HTMLUListElement | null>(null);
    const expanded = useMemo(() => isExpanded(nodeData, treeData) ?? false, [
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

    const handleToggle = useCallback(() => toggleExpansion(nodeData, treeData), [
      toggleExpansion,
      nodeData,
      treeData,
    ]);

    const handleKeyDown = useCallback(
      (event: React.KeyboardEvent<HTMLLIElement>) => onBranchKeyDown(event, nodeData, treeData),
      [onBranchKeyDown, nodeData, treeData],
    );

    return (
      <li
        className={`${className} ${style.tree_item}`}
        role="treeitem"
        tabIndex={-1}
        aria-expanded={expanded}
        aria-selected={isSelected?.(nodeData, treeData)}
        aria-level={level}
        aria-setsize={size}
        aria-posinset={pos}
        onKeyDown={handleKeyDown}
      >
        <div className={style.label}>
          <div
            className={style.default_caret}
            aria-pressed={expanded}
            aria-label="Expand"
            onClick={handleToggle}
          />
          {typeof Label === 'string' ? Label : Label(nodeData, treeData, level, size, pos)}
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
                  onBranchKeyDown={onBranchKeyDown}
                  onLeafKeyDown={onLeafKeyDown}
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
                  onLeafKeyDown={onLeafKeyDown}
                  treeData={treeData}
                />
              ))}
            </ul>
          )}
        </div>
      </li>
    );
  },
);

// --- Public API ---

// TODO: Add autoFocus property
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
  toggleExpansion: (nodeData: any, treeData: any) => void;
  /**
   * `onKeyDown` Event Handler for branch nodes (see `createBranchOnKeyDown`)
   * */
  onLeafKeyDown: KeyDownEventHandler;
  /**
   * `onKeyDown` Event Handler for leaf nodes (see `createLeafOnKeyDown`)
   * */
  onBranchKeyDown: KeyDownEventHandler;
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
   * provided callbacks. This is in combination with the `useReducer` hook very
   * powerful.
   */
  treeData: any;
}

export interface ITreeLabel {
  nodeData: any;
  treeData: any;
  level: number;
  size: number;
  pos: number;
}

export type TreeLabel =
  | ((nodeData: any, treeData: any, level: number, size: number, pos: number) => JSX.Element)
  | string;

/** Presentation for leaf nodes */
export interface ITreeLeaf extends INodeData {
  /** Actual rendered label */
  label: TreeLabel;
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
  isExpanded: (nodeData: any, treeData: any) => boolean;
}

const handleFocus = (event: React.FocusEvent<HTMLUListElement>) => {
  if (event.target.getAttribute('role') !== 'treeitem') {
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
  onBranchKeyDown,
  onLeafKeyDown,
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
      onFocus={handleFocus}
    >
      {branches.map((b, i) => (
        <TreeBranch
          {...b}
          key={b.id}
          level={1}
          size={branches.length + leaves.length}
          pos={i + 1}
          onBranchKeyDown={onBranchKeyDown}
          onLeafKeyDown={onLeafKeyDown}
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
          onLeafKeyDown={onLeafKeyDown}
          treeData={treeData}
        />
      ))}
    </ul>
  );
};

export default Tree;
