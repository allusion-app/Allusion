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
  controls: string;
  children: MenuChildren;
  disabled?: boolean;
}

export const MenuButton = (props: IMenuButton) => {
  const [isOpen, setIsOpen] = useState(false);
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (container.current && isOpen) {
      // Focus first focusable menu item
      const first = container.current.querySelector('[role^="menuitem"]') as HTMLElement | null;
      // The Menu component will handle setting the tab indices.
      if (first !== null) {
        first.focus();
      }
    }
  }, [isOpen]);

  const handleBlur = (e: React.FocusEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      e.stopPropagation();
      setIsOpen(false);
      (e.currentTarget.previousElementSibling as HTMLElement).focus();
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    const target = (e.target as HTMLElement).closest('[role^="menuitem"]') as HTMLElement | null;
    if (target !== null) {
      e.stopPropagation();
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
          controls={props.controls}
          haspopup="menu"
        />
      }
      placement="bottom"
      onBlur={handleBlur}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
    >
      <Menu id={props.controls} labelledby={props.id}>
        {props.children}
      </Menu>
    </RawPopover>
  );
};
