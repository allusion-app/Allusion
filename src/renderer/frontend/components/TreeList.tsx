/** Definitions for Tree List Components
 *
 * A tree list is unordered and contains nodes which are either branches or
 * leaves. This module defines the behaviour of each component, taking care of
 * user input events like drag and drop or mouse clicks.
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';

import { useDrag, useDrop } from 'react-dnd';
import { getEmptyImage } from 'react-dnd-html5-backend';
import { ID } from '../../entities/ID';
import { ITreeNode, Tree, ContextMenu } from '@blueprintjs/core';

/** Drag and Drop interface for branches and leaves */
export interface IDragAndDropItem {
  id: string;
  type: string;
  name: string;
  isSelected: boolean;
}

/** Tree Node Interface */
interface ITreeItemProps {
  id: string;
  name: string;
  isSelected: boolean;
  // Inserts dragged item at a new position in the list
  onDropSelection: (item: IDragAndDropItem) => void;
  onDropHover: () => void;
  isEditing: boolean;
  setEditing: (val: boolean) => void;
  render: (props: ITreeItemRenderProps) => JSX.Element;
}

interface ITreeItemRenderProps {
  id: string;
  name: string;
  isSelected: boolean;
  isEditing: boolean;
  setEditing: (val: boolean) => void;
}

interface ITreeLeafProps extends ITreeItemProps {
  leaf: string;
  onDropLeaf: (item: IDragAndDropItem) => void;
}

/** Generic Tree Leaf
 *
 * Tree leaves can be dragged and dropped on other leaves or branches. Dropping
 * on a leaf inserts the leaf below the drop target but dropping on a branch
 * will insert the leaf at the top of the branch's leaves.
 */
export const TreeLeaf = (props: ITreeLeafProps) => {
  const { id, name, isSelected, leaf, onDropLeaf, render } = props;

  const [{ isDragging }, connectDragSource, connectDragPreview] = useDrag({
    item: { id, name, type: leaf, isSelected },
    begin: () => ({ id, name, type: leaf, isSelected }),
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const [{ isHovering }, connectDropTarget] = useDrop({
    accept: leaf,
    drop: (_, monitor) => {
      // Move the tag to the position where it is dropped (could be other collection as well)
      const item: IDragAndDropItem = monitor.getItem();
      if (item.id !== id) {
        onDropLeaf(item);
      }
    },
    canDrop: (_, monitor) => {
      const item: IDragAndDropItem = monitor.getItem();

      // If a dragged item is selected, make sure nothing in the selection is dropped into itself
      if (item.isSelected) {
        return !isSelected;
      }

      // You cannot drop a tag on itself
      return id !== item.id;
    },
    collect: (monitor) => ({
      isHovering: monitor.isOver(),
    }),
  });
  // Hide preview, since a custom preview is created in DragLayer
  useEffect(() => {
    connectDragPreview(getEmptyImage());
  }, [connectDragPreview]);

  // Style whether the element is being dragged or hovered over to drop on
  const className = `${isHovering ? 'reorder-target' : ''} ${isDragging ? 'reorder-source' : ''}`;
  return connectDropTarget(
    connectDragSource(<div className={className}>{render({ ...props })}</div>),
  );
};

interface ITreeBranchProps extends ITreeItemProps {
  leaf: string;
  branch: string;
  onDropBranch: (item: IDragAndDropItem) => void;
  onDropLeaf: (item: IDragAndDropItem) => void;
  isDescendant: (ancestor: ID) => boolean;
}

/** Generic Tree Branch
 *
 * Tree branches can be dragged and dropped on other branches and will be
 * inserted at the top of the drop target's branches. If a leaf or branch is
 * hovering over a branch, it automatically expand, showing the children which
 * can be branches or leaves.
 */
export const TreeBranch = (props: ITreeBranchProps) => {
  const hoverTimeToExpand = 1000;
  const {
    id,
    name,
    isSelected,
    isDescendant,
    onDropHover,
    leaf,
    onDropLeaf,
    branch,
    onDropBranch,
    onDropSelection,
    render,
  } = props;
  const [{ isDragging }, connectDragSource, connectDragPreview] = useDrag({
    item: { type: branch, id, name, isSelected },
    begin: () => ({ type: branch, id, name, isSelected }),
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  // Drag & drop based on:
  // - https://react-dnd.github.io/react-dnd/examples/sortable/cancel-on-drop-outside
  // - https://gist.github.com/G710/6f85869b73ff08ce95ca93e31ed510f8
  const [{ isHovering, canDrop }, connectDropTarget] = useDrop({
    accept: [branch, leaf],
    drop: (_, monitor) => {
      const item: IDragAndDropItem = monitor.getItem();
      if (item.isSelected) {
        return onDropSelection(item);
      }

      switch (item.type) {
        case branch:
          return onDropBranch(item);
        case leaf:
          return onDropLeaf(item);
        default:
          break;
      }
    },
    canDrop: (_, monitor) => {
      const item: IDragAndDropItem = monitor.getItem();
      if (item.isSelected) {
        return !isSelected;
      }

      switch (monitor.getItemType()) {
        case branch:
          // Dragging a collection over another collection is allowed if it's not itself
          if (item.id === id) {
            return false;
          }
          // and it's not in its own children
          return !isDescendant(item.id);
        case leaf:
          // Dragging a tag over a collection is always allowed if it's not selected
          // Else, only allowed when this collection is not selected (else you drop something on itself)
          return true;
        default:
          return false;
      }
    },
    collect: (monitor) => ({
      isHovering: monitor.isOver(),
      canDrop: monitor.canDrop(),
    }),
  });
  // Hide preview, since a custom preview is created in DragLayer
  useEffect(() => {
    connectDragPreview(getEmptyImage());
  }, [connectDragPreview]);

  // When hovering over a collection for some time, automatically expand it
  const [expandTimeout, setExpandTimeout] = useState(0);
  useEffect(() => {
    if (!canDrop) {
      clearTimeout(expandTimeout);
      return;
    }
    // Clear timer if isHovering changes
    if (expandTimeout) {
      clearTimeout(expandTimeout);
    }
    // Set a timeout to expand after some time if starting to hover
    if (isHovering) {
      setExpandTimeout(window.setTimeout(onDropHover, hoverTimeToExpand));
    }
  }, [canDrop, expandTimeout, isHovering, onDropHover]);

  // Style whether the element is being dragged or hovered over to drop on
  const className = `${canDrop && !isDragging && isHovering ? 'reorder-target' : ''} ${
    isDragging ? 'reorder-source' : ''
    }`;

  return connectDropTarget(
    connectDragSource(<div className={className}>{render({ ...props })}</div>),
  );
};

interface ITreeList {
  nodes: Array<ITreeNode<INodeData>>;
  branch: string;
  leaf: string;
  getSubTreeLeaves: (branch: ID) => ID[];
  expandState: IExpandState;
  setExpandState: (val: IExpandState) => void;
  /** Selecting Leaves */
  onSelect: (selection: ID[], clear?: boolean) => void;
  /** Deselecting Leaves */
  onDeselect: (selection: ID[]) => void;
  /** Number of selected leaves */
  selectionLength: number;
  /** Filtering leaves */
  isSelectionActive: boolean;
  onFilter: (id: ID, type: string, clear?: boolean) => void;
  onContextMenu: (node: ITreeNode<INodeData>) => JSX.Element;
}

/** Additional context node data */
export interface INodeData {
  type: string;
  contextMenu: JSX.Element;
}

/** Map object that keeps track of the IDs that are expanded */
export interface IExpandState {
  [key: string]: boolean;
}

/** Generic Tree List
 *
 * The component handles node expansion and mouse events, and defines the
 * therefore needed state.
 */
export const TreeList = ({
  nodes,
  branch,
  leaf,
  getSubTreeLeaves,
  expandState,
  setExpandState,
  onSelect,
  onDeselect,
  selectionLength,
  isSelectionActive,
  onFilter,
  onContextMenu,
}: ITreeList) => {
  /** The first item that is selected in a multi-selection */
  const initialSelectionIndex = useRef<number | undefined>(undefined);
  /** The last item that is selected in a multi-selection */
  const lastSelectionIndex = useRef<number | undefined>(undefined);

  const handleSelect = useCallback((node: ITreeNode<INodeData>, e: React.MouseEvent, clickSelection: ID[]) => {
    const isClickSelectionSelected = node.isSelected || false;

    const flattenHierarchy = (n: ITreeNode<INodeData>): Array<ITreeNode<INodeData>> => {
      return n.childNodes ? [n, ...n.childNodes.flatMap(flattenHierarchy)] : [n];
    };

    const flatHierarchy = nodes.flatMap((n) => flattenHierarchy(n));
    const i = flatHierarchy.findIndex((item) => item.id === node.id);

    // Based on the event options, add or subtract the clickSelection from the global tag selection
    if (e.shiftKey && initialSelectionIndex.current !== undefined) {
      // Shift selection: Select from the initial up to the current index
      // Make sure that sliceStart is the lowest index of the two and vice versa
      let sliceStart = initialSelectionIndex.current;
      let sliceEnd = i;
      if (sliceEnd < sliceStart) {
        sliceStart = i;
        sliceEnd = initialSelectionIndex.current;
      }
      const idsToSelect = new Set(
        flatHierarchy
          .slice(sliceStart, sliceEnd + 1)
          .filter((item) => !item.hasCaret) // only collections have a caret
          .map((item) => item.id as ID),
      );
      // If the first/last item that was selected was a collection, also add that the tags of that collection
      [sliceStart, sliceEnd].map((index) => {
        if (flatHierarchy[index].hasCaret) {
          getSubTreeLeaves(flatHierarchy[index].id as ID).forEach((tagId) =>
            idsToSelect.add(tagId),
          );
        }
      });
      onSelect(Array.from(idsToSelect), true);

      // Additive selection (previously only with Ctrl down) is now the default behavior
    } else { // if (e.ctrlKey || e.metaKey) {
      initialSelectionIndex.current = i;
      isClickSelectionSelected ? onDeselect(clickSelection) : onSelect(clickSelection);
    }
    // else {
    //   // Normal click: If it was the only one that was selected, deselect it
    //   const isOnlySelected =
    //     isClickSelectionSelected && selectionLength === clickSelection.length;

    //   if (isOnlySelected) {
    //     onDeselect(clickSelection);
    //   } else {
    //     onSelect(clickSelection, true);
    //   }
    //   initialSelectionIndex.current = i;
    // }
    lastSelectionIndex.current = i;
  }, [getSubTreeLeaves, nodes, onDeselect, onSelect, selectionLength]);

  const handleNodeClick = useCallback((node: ITreeNode<INodeData>, _, e: React.MouseEvent) => {
    // The tags selected in this event
    const clickSelection: ID[] = [];

    if (node.nodeData) {
      switch (node.nodeData.type) {
        case branch:
          // When clicking on a branch get all descendants that are leaves
          clickSelection.push(...getSubTreeLeaves(node.id as ID));
          break;
        case leaf:
          // When clicking on a single leaf add to selection
          clickSelection.push(node.id as ID);
          break;
        default:
          // Nothing was selected
          break;
      }
    }

    const target = e.target as HTMLElement;
    const clickedCheckbox = target.classList.contains('selection-icon')
      || (target.parentNode as HTMLElement).classList.contains('selection-icon')
      || ((target.parentNode as HTMLElement).parentNode as HTMLElement).classList.contains('selection-icon');;

    if (clickedCheckbox || isSelectionActive) {
      handleSelect(node, e, clickSelection);
    } else if (node.nodeData) {
      // Filter by collection, or by single tag
      onFilter(node.id as ID, node.nodeData.type, !(e.ctrlKey || e.metaKey));
    }
  }, [branch, getSubTreeLeaves, handleSelect, isSelectionActive, leaf, onFilter]);

  const handleNodeCollapse = useCallback(
    (node: ITreeNode<INodeData>) => setExpandState({ ...expandState, [node.id]: false }),
    [expandState, setExpandState],
  );

  const handleNodeExpand = useCallback(
    (node: ITreeNode<INodeData>) => setExpandState({ ...expandState, [node.id]: true }),
    [expandState, setExpandState],
  );

  const handleNodeContextMenu = (
    node: ITreeNode<INodeData>,
    _: number[],
    e: React.MouseEvent<HTMLElement>,
  ) => {
    ContextMenu.show(onContextMenu(node), { left: e.clientX, top: e.clientY });
  };

  return (
    <Tree
      contents={nodes}
      onNodeCollapse={handleNodeCollapse}
      onNodeExpand={handleNodeExpand}
      onNodeClick={handleNodeClick}
      onNodeContextMenu={handleNodeContextMenu}
    />
  );
};
