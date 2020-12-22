import React, { useEffect, useRef, useState } from 'react';

import { RawPopover } from './RawPopover';

export interface IContextMenu {
  isOpen: boolean;
  x: number;
  y: number;
  /** The element must be a Menu component otherwise focus will not work. */
  children?: React.ReactFragment | React.ReactElement;
  onClose: () => void;
}

export const ContextMenu = ({ isOpen, x, y, children, onClose }: IContextMenu) => {
  const popover = useRef<HTMLDialogElement>(null);
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
    if (!isOpen) {
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
      // Focus first focusable menu item
      const first = popover.current.querySelector('[role^="menuitem"]') as HTMLElement;
      // The Menu component will handle setting the tab indices.
      first?.focus();
    }
  }, [isOpen, x, y]);

  return (
    <RawPopover
      anchorElement={virtualElement}
      popoverRef={popover}
      isOpen={isOpen}
      data-contextmenu
      container="div"
      placement="right-start"
    >
      {children}
    </RawPopover>
  );
};
