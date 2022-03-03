import React, { useEffect, useRef, useState } from 'react';

import { Menu, MenuChildren } from './menus';
import { RawPopover } from '../popovers/RawPopover';

export interface MenuButtonProps {
  id: string;
  text: React.ReactText;
  icon: JSX.Element;
  isCollapsible?: boolean;
  tooltip?: string;
  menuID: string;
  children: MenuChildren;
  disabled?: boolean;
}

export const MenuButton = ({
  id,
  icon,
  text,
  tooltip,
  isCollapsible,
  disabled,
  menuID,
  children,
}: MenuButtonProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const container = useRef<HTMLDivElement>(null);

  // Whenever the menu is opened, focus the first focusable menu item!
  useEffect(() => {
    if (container.current && isOpen) {
      const first: HTMLElement | null = container.current.querySelector('[role^="menuitem"]');
      // The Menu component will handle setting the tab indices.
      if (first !== null) {
        first.focus();
      }
    }
  }, [isOpen]);

  const handleBlur = (e: React.FocusEvent) => {
    const button = e.currentTarget.previousElementSibling as HTMLElement;
    if (e.relatedTarget !== button && !e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsOpen(false);
      button.focus();
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    const menuItem = (e.target as HTMLElement).closest('[role^="menuitem"]') as HTMLElement | null;
    // Don't close when using slider
    const isSlider = (e.target as HTMLInputElement).type === 'range';
    if (menuItem !== null && !isSlider) {
      setIsOpen(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      setIsOpen(false);
      (e.currentTarget.previousElementSibling as HTMLElement).focus();
    }
  };

  return (
    <RawPopover
      popoverRef={container}
      isOpen={isOpen}
      target={
        <button
          id={id}
          className="toolbar-button"
          aria-disabled={disabled}
          data-collapsible={isCollapsible ?? true}
          data-tooltip={tooltip ?? text}
          onClick={disabled ? undefined : () => setIsOpen(!isOpen)}
          aria-expanded={isOpen}
          aria-controls={menuID}
          aria-haspopup="menu"
        >
          <span className="btn-content-icon" aria-hidden>
            {icon}
          </span>
          <span className="btn-content-text">{text}</span>
        </button>
      }
      placement="bottom"
      onBlur={handleBlur}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
    >
      <Menu id={menuID} labelledby={id}>
        {children}
      </Menu>
    </RawPopover>
  );
};
