import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
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
 * Requirements for emulating vscode-split behaviour:
 * - Moving a separator up should resize all below or above above it:
 *   the "active" separator should have priority over the others, we can't just have a general
 *   updatePanelSizes function without knowing which separator is being dragged
 *   - Those panel's sizes should be restored when the separator is moved back in the same drag event:
 *     - Store split points from before drag in state so they can be snapped back into place
 * TODO: panel headers should be a component of MultiSplit, not of the children themselves
 */

/**
 * pseudocode
 * - onDragStart: prevSplitPoints = splitPoints
 * - onDragEnd:   onChange(splitPoints, expansion)
 * - function moveSplitter(index: number) {
    // if (delta < 0) resize panels above
    // if (delta > 0) resize panels below
    // onResize is the same as moving an invisible last splitter, stuck at the end of the content
    }
*/

/**
 * Similar to a Split view, but with multiple panes, each of which can be resized and collapsed
 *
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
  // TODO: if there is just 1 child, no need to enable expansion toggle nor separator

  const container = useRef<HTMLDivElement>(null);
  /** The index of the separator being dragged */
  const draggedIndex = useRef<number | undefined>(undefined);
  /** Initial drag-start split point */
  const origin = useRef(0);
  /** A local copy of the split points for resizing without rerendering during dragging */
  const splitPointsRef = useRef([...splitPoints]);
  // Size of the container element
  const [dimension, setDimension] = useState(0);

  const resizeObserver = useRef(
    new ResizeObserver((entries) => {
      const {
        contentRect: { width, height },
      } = entries[0];
      if (axis === 'vertical') {
        setDimension(width);
      } else {
        setDimension(height);
      }
    }),
  );

  const updatePanelSizes = useCallback(() => {
    if (container.current === null) return;

    const numPanels = expansion.length;

    // The last expanded panel takes up the remaining space of the container.
    // It can overflow if there is not enough space: must be at least minPanelSize (if expansion is enabled)
    const lastExpandedPanelIndex = expansion.lastIndexOf(true);

    // Distribute the full width/height (dimension) of the container to the children
    // The panel currently being resized (isDragging) gets priority: others will be resized to make it fit as long as they can
    const splitPoints = splitPointsRef.current;

    // First set any collapsed panels to the size of their header, and position other panels accordingly
    for (let i = 0; i < splitPoints.length; i++) {
      splitPoints[i] = expansion[i]
        ? Math.max(splitPoints[i], (splitPoints[i - 1] || 0) + minPaneSize)
        : (splitPoints[i - 1] || 0) + HEADER_SIZE;
    }

    // Then compute the size of the last expanded panel, and move other panels accordingly
    let lastPanelSize = HEADER_SIZE;
    if (lastExpandedPanelIndex !== -1) {
      // Fill container with the last expanded panel
      const remainingCollapsedPanelSize = (numPanels - lastExpandedPanelIndex + 1) * HEADER_SIZE;
      const lastExpandedPanelSize = Math.max(dimension - remainingCollapsedPanelSize, minPaneSize);
      const lastExpandedPanelPosition =
        lastExpandedPanelIndex === 0 ? 0 : splitPoints[lastExpandedPanelIndex - 1];

      if (lastExpandedPanelIndex === numPanels - 1) {
        lastPanelSize = lastExpandedPanelSize;
      }

      for (let i = lastExpandedPanelIndex; i < numPanels; i++) {
        if (i === lastExpandedPanelIndex) {
          splitPoints[i] = lastExpandedPanelPosition + lastExpandedPanelSize;
        } else {
          splitPoints[i] = splitPoints[i - 1] + HEADER_SIZE;
        }
      }
    }

    // Now we can compute the final panel sizes
    const panelSizes = [...new Array(numPanels)].map((_, i) =>
      i === numPanels - 1 ? lastPanelSize : splitPoints[i],
    );

    // Now actually update the view
    const positionAttr = axis === 'vertical' ? 'left' : 'top';
    const sizeAttr = axis === 'vertical' ? 'width' : 'height';
    for (let i = 0; i < numPanels; i++) {
      const panelElem = container.current.children[i * 2] as HTMLElement;

      const panelSize = panelSizes[i];
      const panelPosition = i === 0 ? 0 : splitPoints[i - 1];

      // Panel itself:
      panelElem.style[sizeAttr] = `${panelSize}px`;
      panelElem.style[positionAttr] = `${panelPosition}px`;

      if (i !== numPanels - 1) {
        const splitterElem = container.current.children[i * 2 + 1] as HTMLElement;

        // Splitter
        if (i * 2 + i < container.current.children.length) {
          splitterElem.style[positionAttr] = `${splitPoints[i]}px`;
        }
      }
    }
  }, [axis, dimension, expansion, minPaneSize]);

  const handleMouseDownSeparator = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
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

      splitPointsRef.current[index] = newSplitPoint;

      updatePanelSizes();

      // if (axis === 'vertical') {

      //   onMove(index, e.clientX - origin.current, e.currentTarget.clientWidth);
      // } else {
      //   onMove(index, e.clientY - origin.current, e.currentTarget.clientHeight);
      // }
    },
    [axis, updatePanelSizes],
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
  }, []);

  const enabledSeparatorRange = useMemo(() => {
    return [
      expansion.findIndex((e) => e === true),
      expansion.length - 1 - expansion.reverse().findIndex((e) => e === true),
    ];
  }, [expansion]);

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
