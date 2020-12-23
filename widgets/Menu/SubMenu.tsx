import React, { useState, useRef } from 'react';

import { IconSet } from '../Icons';
import { RawPopover } from '../popovers/RawPopover';

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
            isOpen={isOpen}
            setIsOpen={setIsOpen}
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

interface IMenuItemLink {
  isOpen: boolean;
  setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
  icon?: JSX.Element;
  text: string;
  disabled?: boolean;
}

const MenuItemLink = ({ isOpen, setIsOpen, disabled, icon, text }: IMenuItemLink) => {
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  const handleMouseEnter = (e: React.MouseEvent<HTMLElement>) => {
    if (!disabled) {
      e.currentTarget.focus();
      setIsOpen(true);
    }
  };

  const handleMouseLeave = (e: React.MouseEvent<HTMLElement>) => {
    if (!(e.currentTarget.parentElement as HTMLElement).contains(e.relatedTarget as Node)) {
      setIsOpen(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLElement>) => {
    if (!disabled && (e.key === 'ArrowRight' || e.key === 'Enter')) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const first = e.currentTarget.nextElementSibling!.querySelector(
        '[role^="menuitem"]',
      ) as HTMLElement | null;
      if (first !== null) {
        e.stopPropagation();
        setIsOpen(true);
        first.focus();
      }
    } else if (e.key === 'ArrowUp') {
      let listItem = e.currentTarget.parentElement as HTMLElement;
      if (listItem.previousElementSibling !== null) {
        e.stopPropagation();
        listItem = listItem.previousElementSibling as HTMLElement;

        if (listItem.matches('[role="none"]')) {
          listItem = listItem.querySelector('[role^="menuitem"]') as HTMLElement;
        } else if (listItem.matches('[role="separator"]')) {
          listItem = listItem.previousElementSibling as HTMLElement;
        }
        // If listItem becomes null, this is a serious badly made UI. A
        // separator should never be the first item and groups should not be
        // empty or if unavaible just become disabled.
        listItem.focus();
      }
    } else if (e.key === 'ArrowDown') {
      let listItem = e.currentTarget.parentElement as HTMLElement;
      if (listItem.nextElementSibling !== null) {
        e.stopPropagation();
        listItem = listItem.nextElementSibling as HTMLElement;

        if (listItem.matches('[role="none"]')) {
          listItem = listItem.querySelector('[role^="menuitem"]') as HTMLElement;
        } else if (listItem.matches('[role="separator"]')) {
          listItem = listItem.nextElementSibling as HTMLElement;
        }
        // If listItem becomes null, this is a serious badly made UI. A
        // separator should never be the last item and groups should not be
        // empty or if unavaible just become disabled.
        listItem.focus();
      }
    }
  };

  return (
    <a
      tabIndex={-1}
      role="menuitem"
      aria-haspopup="menu"
      aria-expanded={isOpen}
      aria-disabled={disabled}
      href="#"
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onKeyDown={handleKeyDown}
    >
      <span className="item-icon" aria-hidden>
        {icon}
      </span>
      {text}
      <span className="item-accelerator" aria-hidden>
        {IconSet.ARROW_RIGHT}
      </span>
    </a>
  );
};
