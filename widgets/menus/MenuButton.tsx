import React, { useLayoutEffect, useRef, useState } from 'react';

import { Menu, MenuChildren } from './menus';
import { usePopover } from '../popovers/usePopover';

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
  const menu = useRef<HTMLUListElement>(null);
  const { style, reference, floating, update } = usePopover('bottom');

  // Whenever the menu is opened, focus the first focusable menu item!
  useLayoutEffect(() => {
    if (menu.current && isOpen) {
      const first: HTMLElement | null = menu.current.querySelector('[role^="menuitem"]');
      // The Menu component will handle setting the tab indices.
      if (first !== null) {
        first.focus();
      }
      update();
    }
  }, [isOpen, update]);

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
    <>
      <button
        id={id}
        ref={reference}
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
      <div
        ref={floating}
        data-popover
        data-open={isOpen}
        style={style}
        onBlur={handleBlur}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
      >
        <Menu ref={menu} id={menuID} labelledby={id}>
          {children}
        </Menu>
      </div>
    </>
  );
};
