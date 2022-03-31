import React, { useEffect, useLayoutEffect, useRef } from 'react';
import { Portal } from 'src/frontend/hooks/usePortal';
import { usePopover } from '../popovers/usePopover';
import { MenuProps } from './menus';

export interface IContextMenu {
  isOpen: boolean;
  x: number;
  y: number;
  children?: React.ReactElement<MenuProps> | React.ReactFragment;
  close: () => void;
  usePortal?: boolean;
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
export const ContextMenu = ({ isOpen, x, y, children, close, usePortal = true }: IContextMenu) => {
  const container = useRef<HTMLDivElement>(null);
  const boundingRect = useRef(new DOMRect());
  const { style, reference, floating, update } = usePopover('right-start');

  useEffect(() => {
    floating(container.current);
    // Capture only the DOMRect and not the React MutableRefObject
    const boundingRectRef = boundingRect.current;
    reference({ getBoundingClientRect: () => boundingRectRef });
  }, [floating, reference]);

  useLayoutEffect(() => {
    if (container.current && isOpen) {
      // Focus container so the keydown event can be handled even without a mouse.
      container.current.focus();

      // Update bounding rect
      // Do not replace the DOMRect object reference!
      boundingRect.current.x = x;
      boundingRect.current.y = y;
      update();
    }
  }, [isOpen, update, x, y]);

  // Close upon executing a command from a menu item
  const handleClick = (e: React.MouseEvent) => {
    const target = (e.target as HTMLElement).closest('li[role^="menuitem"]') as HTMLElement | null;
    if (target !== null) {
      close();
    }
  };

  // Clicking or tabbing outside will close the context menu by default
  const handleBlur = (e: React.FocusEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      close();
    }
  };

  // Handles keyboard navigation if no menu item has been focused yet
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      close();
    } else if (e.key === 'ArrowDown') {
      const first: HTMLElement | null = e.currentTarget.querySelector('[role^="menuitem"]');
      if (first !== null) {
        e.stopPropagation();
        first.focus();
      }
    } else if (e.key === 'ArrowUp') {
      // FIXME: It's not performant but a context menu is usually shorter than a `Tree`.
      const last: NodeListOf<HTMLElement> = e.currentTarget.querySelectorAll('[role^="menuitem"]');
      if (last.length > 0) {
        e.stopPropagation();
        last[last.length - 1].focus();
      }
    }
  };

  const menu = (
    <div
      ref={container}
      style={style}
      data-popover
      data-open={isOpen}
      data-contextmenu
      tabIndex={-1}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      onClick={handleClick}
      onMouseOver={handleMouseOver}
    >
      {isOpen ? children : null}
    </div>
  );

  if (usePortal) {
    return <Portal id="context-menu-portal">{menu}</Portal>;
  } else {
    return menu;
  }
};

// Applies focus to the menu item which allows to use keyboard navigation immediately
function handleMouseOver(event: React.MouseEvent) {
  const target = (event.target as Element).closest('[role^="menuitem"]') as HTMLElement | null;
  if (target !== null) {
    target.focus();
  }
}
