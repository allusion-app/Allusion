import './menu.scss';
import React, { useRef, useState } from 'react';

export interface IMenu {
  id?: string;
  children: React.ReactNode;
  label?: string;
  labelledby?: string;
}

export const Menu = ({ id, children, label, labelledby }: IMenu) => (
  <ul
    id={id}
    role="menu"
    aria-label={label}
    aria-labelledby={labelledby}
    onFocus={handleFocus}
    onMouseOver={handleMouseOver}
  >
    {children}
  </ul>
);

import { RawPopover } from '../popovers/RawPopover';
import { MenuItemLink } from './menu_items';

export interface ISubMenu {
  icon?: JSX.Element;
  text: string;
  disabled?: boolean;
  children: React.ReactNode;
}

export const SubMenu = ({ text, icon, disabled, children }: ISubMenu) => {
  const [isOpen, setIsOpen] = useState(false);
  const menu = useRef<HTMLUListElement>(null);

  const handleBlur = (e: React.FocusEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      e.stopPropagation();
      setIsOpen(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      setIsOpen(false);
      // Returns focus to the anchor element.
      (e.currentTarget.firstElementChild as HTMLElement).focus();
    } else if (!disabled && e.key === 'ArrowLeft') {
      e.stopPropagation();
      setIsOpen(false);
      // Returns focus to the anchor element.
      (e.currentTarget.firstElementChild as HTMLElement).focus();
    }
  };

  return (
    <li role="none" onBlur={handleBlur} onKeyDown={handleKeyDown}>
      <RawPopover
        popoverRef={menu}
        isOpen={isOpen}
        target={
          <MenuItemLink
            expanded={isOpen}
            setExpanded={setIsOpen}
            text={text}
            icon={icon}
            disabled={disabled}
          />
        }
        container="ul"
        placement="right-start"
        fallbackPlacements={['right-end', 'right']}
        data-submenu
        role="menu"
        aria-label={text}
        className="menu"
      >
        {children}
      </RawPopover>
    </li>
  );
};

import { IMenuRadioItem } from './menu_items';

interface IMenuRadioGroup {
  children: React.ReactElement<IMenuRadioItem>[];
  label?: string;
}

export const MenuRadioGroup = ({ children, label }: IMenuRadioGroup) => (
  <li role="none">
    <ul role="group" aria-label={label}>
      {children}
    </ul>
  </li>
);

const handleFocus = (event: React.FocusEvent<HTMLUListElement>) => {
  const target = event.target.closest('[role^="menuitem"]') as HTMLElement | null;
  if (target === null) {
    return;
  }
  const previous = event.currentTarget.querySelector('[role^="menuitem"][tabindex="0"]');
  if (previous !== null) {
    previous.setAttribute('tabIndex', '-1');
  }
  target.setAttribute('tabIndex', '0');
  // target.focus({ preventScroll: true }); // CHROME BUG: Option is ignored, probably fixed in Electron 9.
  target.focus();
};

function handleMouseOver(event: React.MouseEvent) {
  const target = (event.target as Element).closest('[role^="menuitem"]') as HTMLElement | null;
  if (target !== null) {
    target.focus();
  }
}
