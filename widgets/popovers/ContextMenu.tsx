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
  const container = useRef<HTMLDivElement>(null);
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
    if (container.current && isOpen) {
      // Focus container so the keydown event can be handled even without a mouse.
      container.current.focus();

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
      e.stopPropagation();
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
      container="div"
      placement="right-start"
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      onClick={handleClick}
      tabIndex={-1}
    >
      {children}
    </RawPopover>
  );
};
