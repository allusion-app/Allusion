import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { SplitAxis } from '.';

interface MultiSplitProps {
  axis: SplitAxis;
  /** Whether each panel is expanded or not. Size N */
  expansion: boolean[];
  /** Position of each separator in pixels. Size N-1, since last panel has no movable separator */
  splitPoints: number[];
  /** Called onDragEnd on a splitter or when a panel is (un)expanded */
  onChange?: (splitPoints: number[], expansion: boolean[]) => void;
  minPaneSize?: number;
}

interface MultiSplitChildProps {
  title: string;
  id: string;
}

const HEADER_SIZE = 24;

/**
 * Similar to a Split view, but with multiple panes, each of which can be resized and collapsed.
 * Trying to reproduce the same behavior as in VSCode:
 * - Moving a separator up should resize all below or above above it:
 *   The "active" separator should have priority over the others: others should be resized up to their minimum size
 * - When moving a separator up and down, other separators should snap back to their original position during the drag event.
 *   Need to store split points from before drag event
 * - The last panel should fill up the rest of the container.
 *   The container may overflow when all panels are at their minimum size do not fit in the container
 *
 * TODOS:
 * TODO: Should move the panel headers to a Panel component instead of defining them in the child components (which is happening now)
 * TODO: if there is just 1 child, no need to enable expansion toggle nor separator
 * TODO: would be nice to have a context menu to disable undesired panels for the user
 */
const MultiSplit: React.FC<MultiSplitProps> = ({
  children,
  splitPoints,
  expansion,
  axis,
  onChange,
  minPaneSize = 100,
}) => {
  const container = useRef<HTMLDivElement>(null);
  /** The index of the separator being dragged (if any) */
  const draggedIndex = useRef<number | undefined>(undefined);
  /** Initial drag-start position of the separator being dragged */
  const origin = useRef(0);
  /** A local copy of the split points as ref for resizing without rerendering during dragging. Maybe not needed? */
  const splitPointsRef = useRef([...splitPoints]);
  /** The split points from when the drag event started, so they can be restored when needed */
  const prevSplitPointsRef = useRef([...splitPoints]);
  // Size of the container element
  const [dimension, setDimension] = useState(0);

  const resizeObserver = useRef(
    new ResizeObserver((entries) => {
      const {
        contentRect: { width, height },
      } = entries[0];
      console.log('resize', width, height);
      if (axis === 'vertical') {
        setDimension(width);
      } else {
        setDimension(height);
      }
    }),
  );

  const handleMoveSeparator = useCallback(
    (dragIndex: number, position: number) => {
      // Move this separator to the new position
      // - if any panels in the direction of the drag can become narrower, resize them
      //   if they reach the minimum size, the separator position should stick to the minimum size
      //
      // Only once the drag event has ended, we can update the split points

      // Difference from initial drag start position: this is how much the separator has moved
      let delta = position - prevSplitPointsRef.current[dragIndex];

      // Start off with the splint points from when the drag event started,
      // so that each initial separator positions snaps back into place when dragging in both directions
      const newSplitPoints = [...prevSplitPointsRef.current];

      const numPanels = newSplitPoints.length + 1;
      const lastPanelSize = Math.max(
        dimension - splitPoints[splitPoints.length - 1],
        expansion[numPanels - 1] ? minPaneSize : HEADER_SIZE,
      );

      // Current size of all panes
      const paneSizes = [...new Array(numPanels)].map((_, i) =>
        i !== numPanels - 1 ? newSplitPoints[i] - (newSplitPoints[i - 1] ?? 0) : lastPanelSize,
      );

      // Maximum amount any pane can shrink
      const shrinkAmounts = [...new Array(newSplitPoints.length)].map((_, i) =>
        expansion[i] ? Math.max(minPaneSize, paneSizes[i] - minPaneSize) : 0,
      );

      // are we moving up or down?
      if (delta < 0) {
        // Up: Clamp the new position at the top
        // - we need to shrink the previous panels by delta while keeping all panels above their min size:
        // - shrink the panel above the one being dragged until it reaches the minimum size, then onto the one above it, etc.

        // TODO: this feels over-complicated. I can't get it to behave right either. Is there a simpler approach?
        for (let i = dragIndex; i >= 0; i--) {
          const paneShrinkAmount = Math.min(-delta, shrinkAmounts[i]);
          delta += paneShrinkAmount;
          for (let j = i; j <= dragIndex; j++) {
            newSplitPoints[j] -= paneShrinkAmount;
          }
          if (delta === 0) {
            break;
          }
        }
      } else {
        // Down: shrinking a panel is done by moving the previous panel's separator
        for (let i = dragIndex + 1; i < splitPoints.length; i++) {
          const paneShrinkAmount = Math.min(delta, shrinkAmounts[i]);
          for (let j = i; j <= splitPoints.length; j++) {
            newSplitPoints[j - 1] += paneShrinkAmount;
          }
          delta -= paneShrinkAmount;
          if (delta === 0) {
            break;
          }
        }
      }
      console.log({ splitPoints, prevSplitPoints: prevSplitPointsRef.current, newSplitPoints });

      splitPointsRef.current = newSplitPoints;

      // Now actually update the view
      // (could also do this in a more react-y way: set style={} attributes on the children)
      if (!container.current) return;
      const positionAttr = axis === 'vertical' ? 'left' : 'top';
      const sizeAttr = axis === 'vertical' ? 'width' : 'height';
      for (let i = 0; i < numPanels; i++) {
        const panelElem = container.current.children[i * 2] as HTMLElement;

        const panelSize = newSplitPoints[i] - (newSplitPoints[i - 1] ?? 0);
        const panelPosition = i === 0 ? 0 : newSplitPoints[i - 1];

        // Panel itself:
        panelElem.style[sizeAttr] = `${panelSize}px`;
        panelElem.style[positionAttr] = `${panelPosition}px`;

        // Last panel doesn't have a sepatator: it's stuck to the bottom of the container
        if (i !== numPanels - 1) {
          const splitterElem = container.current.children[i * 2 + 1] as HTMLElement;

          // Splitter
          if (i * 2 + i < container.current.children.length) {
            splitterElem.style[positionAttr] = `${newSplitPoints[i]}px`;
          }
        }
      }
    },
    [axis, dimension, expansion, minPaneSize, splitPoints],
  );

  const handleMouseDownSeparator = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      prevSplitPointsRef.current = [...splitPointsRef.current];

      // Get index from data-index attribute
      const index = Number(e.currentTarget.dataset.index);

      // Mark the current separator as being dragged
      draggedIndex.current = index;

      if (container.current !== null) {
        // Update the cursor style
        const rect = container.current.getBoundingClientRect();
        if (axis === 'vertical') {
          origin.current = rect.left;
          container.current.style.cursor = 'w-resize';
        } else {
          origin.current = rect.top;
          container.current.style.cursor = 's-resize';
        }
        // Apply the "active" class to the clicked separator
        (container.current.children[index * 2 + 1] as HTMLElement).classList.add('active');
      }
    },
    [axis],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (draggedIndex.current === undefined) {
        return;
      }

      const index = draggedIndex.current;

      const newSplitPoint =
        axis === 'vertical' ? e.clientX - origin.current : e.clientY - origin.current;

      handleMoveSeparator(index, newSplitPoint);
    },
    [axis, handleMoveSeparator],
  );

  useEffect(() => {
    const observer = resizeObserver.current;
    const handleMouseUp = () => {
      if (draggedIndex.current !== undefined && container.current !== null) {
        container.current.style.cursor = '';
        (container.current.children[draggedIndex.current * 2 + 1] as HTMLElement).classList.remove(
          'active',
        );

        onChange?.(splitPointsRef.current, expansion);
      }
      draggedIndex.current = undefined;
    };

    // Workaround for popup windows
    let body: HTMLElement | null = null;
    if (container.current !== null) {
      body = container.current.closest('body') as HTMLElement;
      body.addEventListener('mouseup', handleMouseUp);
      resizeObserver.current.observe(container.current);
    }
    return () => {
      observer.disconnect();
      body?.removeEventListener('mouseup', handleMouseUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const enabledSeparatorRange = useMemo(() => {
    return [
      expansion.findIndex((e) => e === true),
      expansion.length - 1 - expansion.reverse().findIndex((e) => e === true),
    ];
  }, [expansion]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  // TODO: initialize the panel sizes and separator positions
  // useEffect(() => updateView(), []);

  return (
    <div className="multi-split" onMouseMove={handleMouseMove} ref={container}>
      {React.Children.map(children, (child, index) => {
        const typedChild = child as React.ReactElement<
          React.PropsWithChildren<MultiSplitChildProps>
        >;
        return (
          <React.Fragment key={`split-pane-${typedChild?.key || typedChild?.props?.id || index}`}>
            {React.cloneElement(typedChild)}

            {index < React.Children.count(children) - 1 && (
              <div
                role="separator"
                aria-valuenow={Math.trunc((splitPointsRef.current[index] / dimension) * 100)}
                aria-orientation={axis}
                data-index={index}
                onMouseDown={handleMouseDownSeparator}
                className={
                  //Only show separator when the pane is not part of the panels stuck to the top or bottom
                  index >= enabledSeparatorRange[0] && index <= enabledSeparatorRange[1]
                    ? ''
                    : 'hidden'
                }
              />
            )}
          </React.Fragment>
        );
      }) || null}
    </div>
  );
};

export default MultiSplit;
