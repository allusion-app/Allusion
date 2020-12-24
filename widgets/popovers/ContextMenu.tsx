import React, { useEffect, useRef, useState } from 'react';

import { RawPopover } from './RawPopover';

export interface IContextMenu {
  isOpen: boolean;
  x: number;
  y: number;
  /** The element must be a Menu component otherwise focus will not work. */
  children?: React.ReactNode;
  // TODO: Rename to close or cancel
  onClose: () => void;
}

/**
 * The classic desktop context menu
 *
 * Unlike other implementations there is no single context menu added through a
 * React portal. This component is driven entirely by the state of your app.
 *
 * This might seem inconvenient but the upside is that styling has not to be
 * re-applied to a portal and that multiple context menus can exist without
 * harming performance. In short this component is more inconvenient but allows
 * for better composability.
 *
 * Since it is really annoying to always write out the same lines of code, the
 * `useContextMenu` hook can be used to create all the necessary state and
 * callbacks which can be used to set the state from deep within a tree.
 */
export const ContextMenu = ({ isOpen, x, y, children, onClose }: IContextMenu) => {
  const container = useRef<HTMLDivElement>(null);
  const boundingRect = useRef({
    width: 0,
    height: 0,
    top: y,
    right: x,
    bottom: y,
    left: x,
  });
  const [virtualElement, setVirtualElement] = useState({
    getBoundingClientRect: () => boundingRect.current,
  });

  useEffect(() => {
    if (container.current && isOpen) {
      // Focus container so the keydown event can be handled even without a mouse.
      container.current.focus();

      // Update bounding rect
      const rect = boundingRect.current;
      rect.top = y;
      rect.right = x;
      rect.bottom = y;
      rect.left = x;
      setVirtualElement({
        getBoundingClientRect: () => boundingRect.current,
      });
    }
  }, [isOpen, x, y]);

  // Close upon executing a command from a menu item
  const handleClick = (e: React.MouseEvent) => {
    const target = (e.target as HTMLElement).closest('[role^="menuitem"]') as HTMLElement | null;
    if (target !== null) {
      e.stopPropagation();
      onClose();
    }
  };

  // Clicking or tabbing outside will close the context menu by default
  const handleBlur = (e: React.FocusEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      e.stopPropagation();
      onClose();
    }
  };

  // Applies focus to the menu item which allows to use keyboard navigation immediately
  function handleMouseOver(event: React.MouseEvent) {
    const target = (event.target as Element).closest('[role^="menuitem"]') as HTMLElement | null;
    if (target !== null) {
      target.focus();
    }
  }

  // Handles keyboard navigation if no menu item has been focused yet
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      onClose();
    } else if (e.key === 'ArrowDown') {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const first: HTMLElement | null = container.current!.querySelector('[role^="menuitem"]');
      if (first !== null) {
        e.stopPropagation();
        first.focus();
      }
    } else if (e.key === 'ArrowUp') {
      // FIXME: It's not performant but a context menu is usually shorter than a `Tree`.
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const last: NodeListOf<HTMLElement> = container.current!.querySelectorAll(
        '[role^="menuitem"]',
      );
      if (last.length > 0) {
        e.stopPropagation();
        last[last.length - 1].focus();
      }
    }
  };

  return (
    <RawPopover
      anchorElement={virtualElement}
      popoverRef={container}
      isOpen={isOpen}
      data-contextmenu
      placement="right-start"
      tabIndex={-1}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      onClick={handleClick}
      onMouseOver={handleMouseOver}
    >
      {children}
    </RawPopover>
  );
};
