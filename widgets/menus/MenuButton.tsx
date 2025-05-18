import React, { useLayoutEffect, useRef, useState } from 'react';

import { Menu, MenuChildren } from './menus';
import { usePopover } from '../popovers/usePopover';
import { Placement } from '@floating-ui/core';

export interface MenuButtonProps {
  id: string;
  text: React.ReactText;
  icon: JSX.Element;
  isCollapsible?: boolean;
  tooltip?: string;
  menuID: string;
  children: MenuChildren;
  disabled?: boolean;
  placement?: Placement;
  updateDependency?: any;
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
  placement = 'bottom',
  updateDependency = children,
}: MenuButtonProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const menu = useRef<HTMLUListElement>(null);
  const { style, reference, floating, update } = usePopover(placement);

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
  }, [isOpen, update, updateDependency]);

  const handleBlur = (e: React.FocusEvent) => {
    const button = e.currentTarget.previousElementSibling as HTMLElement;
    if (
      e.relatedTarget !== button &&
      !e.currentTarget.contains(e.relatedTarget as Node) &&
      !e.relatedTarget?.closest('[data-contextmenu="true"]')
    ) {
      setIsOpen(false);
      button.focus();
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    const menuItem = (e.target as HTMLElement).closest('[role^="menuitem"]') as HTMLElement | null;
    // Don't close when using slider
    const isSlider = (e.target as HTMLInputElement).type === 'range';
    // Don't close when the item is an input
    const isInput = (e.target as HTMLElement).tagName === 'INPUT';
    if (menuItem !== null && !isSlider && !isInput) {
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
        {icon}
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
