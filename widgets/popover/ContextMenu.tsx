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

export const ContextMenu = ({ isOpen, x, y, children, onClose }: IContextMenu) => {
  const popover = useRef<HTMLDivElement>(null);
  const [virtualElement, setVirtualElement] = useState({
    getBoundingClientRect: () => ({
      width: 0,
      height: 0,
      top: y,
      right: x,
      bottom: y,
      left: x,
    }),
  });

  useEffect(() => {
    if (popover.current === null) {
      return;
    }
    if (isOpen) {
      // Focus first focusable menu item
      const first = popover.current.querySelector('[role^="menuitem"]') as HTMLElement | null;
      // The Menu component will handle setting the tab indices.
      if (first !== null) {
        first.focus();
      }
    } else {
      onClose();
    }
  }, [isOpen, onClose]);

  useEffect(() => {
    if (popover.current && isOpen) {
      setVirtualElement({
        getBoundingClientRect: () => ({
          width: 0,
          height: 0,
          top: y,
          right: x,
          bottom: y,
          left: x,
        }),
      });
    }
  }, [isOpen, x, y]);

  const handleClick = (e: React.MouseEvent) => {
    const target = (e.target as HTMLElement).closest('[role^="menuitem"]') as HTMLElement | null;
    if (target !== null) {
      onClose();
    }
  };

  const handleBlur = (e: React.FocusEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      e.stopPropagation();
      onClose();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      onClose();
      // Returns focus to the anchor element.
      const target = e.currentTarget.previousElementSibling as HTMLElement;
      target.focus();
    }
  };

  return (
    <RawPopover
      anchorElement={virtualElement}
      popoverRef={popover}
      isOpen={isOpen}
      data-contextmenu
      container="div"
      placement="right-start"
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      onClick={handleClick}
    >
      {children}
    </RawPopover>
  );
};
