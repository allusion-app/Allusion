import React, { useEffect, useRef, useState } from 'react';

import { ToolbarButton } from './index';
import { Menu, MenuChildren } from '../menus';
import { RawPopover } from '../popovers/RawPopover';

export interface IMenuButton {
  id: string;
  text: React.ReactText;
  icon: JSX.Element;
  showLabel?: 'always' | 'never';
  tooltip?: string;
  menuID: string;
  children: MenuChildren;
  disabled?: boolean;
}

export const MenuButton = (props: IMenuButton) => {
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
    const target = (e.target as HTMLElement).closest('[role^="menuitem"]') as HTMLElement | null;
    if (target !== null) {
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
        <ToolbarButton
          id={props.id}
          icon={props.icon}
          text={props.text}
          disabled={props.disabled}
          showLabel={props.showLabel}
          tooltip={props.tooltip}
          onClick={() => setIsOpen(!isOpen)}
          expanded={isOpen}
          controls={props.menuID}
          haspopup="menu"
        />
      }
      placement="bottom"
      onBlur={handleBlur}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
    >
      <Menu id={props.menuID} labelledby={props.id}>
        {props.children}
      </Menu>
    </RawPopover>
  );
};
