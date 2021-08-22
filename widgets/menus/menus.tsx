import './menu.scss';
import React, { useRef, useState } from 'react';

import { IMenuCheckboxItem, IMenuItem, IMenuItemLink, IMenuRadioItem } from './menu-items';

export interface IMenu {
  id?: string;
  children: MenuChildren;
  label?: string;
  labelledby?: string;
}

export type MenuChildren = MenuChild | MenuChild[] | React.ReactFragment;

export type MenuChild =
  | React.ReactElement<IMenuCheckboxItem>
  | React.ReactElement<IMenuItem>
  | React.ReactElement<IMenuItemLink>
  | React.ReactElement<IMenuRadioGroup>
  | React.ReactElement<IMenuRadioGroup>
  | React.ReactElement<IMenuSubItem>;

export const Menu = ({ id, children, label, labelledby }: IMenu) => {
  return (
    <ul
      id={id}
      role="menu"
      aria-label={label}
      aria-labelledby={labelledby}
      onFocus={handleFocus}
      onKeyDown={handleMenuKeyDown}
    >
      {children}
    </ul>
  );
};

import { RawPopover } from '../popovers/RawPopover';
import { MenuItemLink } from './menu-items';

export interface IMenuSubItem {
  icon?: JSX.Element;
  text: string;
  disabled?: boolean;
  children: React.ReactNode;
}

export const MenuSubItem = ({ text, icon, disabled, children }: IMenuSubItem) => {
  const [isOpen, setIsOpen] = useState(false);
  const menu = useRef<HTMLUListElement>(null);

  const handleBlur = (e: React.FocusEvent) => {
    if (isOpen && !e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsOpen(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (isOpen && e.key === 'Escape') {
      e.stopPropagation();
      setIsOpen(false);
      // Returns focus to the anchor element.
      (e.currentTarget.firstElementChild as HTMLElement).focus();
    } else if (isOpen && e.key === 'ArrowLeft') {
      e.stopPropagation();
      setIsOpen(false);
      // Returns focus to the anchor element.
      (e.currentTarget.firstElementChild as HTMLElement).focus();
    } else if (!disabled && (e.key === 'ArrowRight' || e.key === 'Enter')) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const first: HTMLElement | null = e.currentTarget.lastElementChild!.querySelector(
        '[role^="menuitem"]',
      );
      if (first !== null) {
        e.stopPropagation();
        setIsOpen(true);
        requestAnimationFrame(() => requestAnimationFrame(() => first.focus()));
      }
    } else {
      handleMenuKeyDown(e);
    }
  };

  const handleMouseEnter = (e: React.MouseEvent<HTMLElement>) => {
    if (!disabled && e.currentTarget.firstElementChild === e.target) {
      (e.currentTarget.firstElementChild as HTMLElement).focus();
      setIsOpen(true);
    }
  };

  const handleMouseLeave = (e: React.MouseEvent<HTMLElement>) => {
    if (
      e.currentTarget.firstElementChild === e.target &&
      !e.currentTarget.contains(e.relatedTarget as Node)
    ) {
      setIsOpen(false);
    }
  };

  return (
    <li
      role="none"
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <RawPopover
        popoverRef={menu}
        isOpen={isOpen}
        target={<MenuItemLink expanded={isOpen} text={text} icon={icon} disabled={disabled} />}
        container="ul"
        placement="right-start"
        fallbackPlacements={['right-end', 'right']}
        role="menu"
        aria-label={text}
        className="menu"
      >
        {children}
      </RawPopover>
    </li>
  );
};

export interface IMenuRadioGroup {
  children: React.ReactElement<IMenuRadioItem>[];
  label?: string;
}

export const MenuRadioGroup = ({ children, label }: IMenuRadioGroup) => (
  <li role="none">
    <ul role="group" aria-label={label} onKeyDown={handleMenuKeyDown}>
      {children}
    </ul>
  </li>
);

function handleFocus(event: React.FocusEvent) {
  const target = event.target.closest('[role^="menuitem"]') as HTMLElement | null;
  if (target === null) {
    return;
  }

  const previous: HTMLElement | null = event.currentTarget.querySelector(
    '[role^="menuitem"][tabindex="0"]',
  );
  if (previous !== null) {
    previous.tabIndex = -1;
  }
  target.tabIndex = 0;
  // target.focus({ preventScroll: true }); // CHROME BUG: Option is ignored, probably fixed in Electron 9.
  target.focus();
}

function handleMenuKeyDown(event: React.KeyboardEvent) {
  if (event.key === 'Enter') {
    if ((event.target as HTMLElement).matches('[role^="menuitem"]')) {
      event.stopPropagation();
      (event.target as HTMLElement).click();
    }
  } else if (event.key === 'ArrowUp') {
    let listItem = (event.target as HTMLElement).closest('li') as HTMLElement | null;
    if (listItem === null) {
      return;
    }
    if (listItem.previousElementSibling !== null) {
      event.stopPropagation();
      listItem = listItem.previousElementSibling as HTMLElement;

      if (listItem.matches('[role="none"]')) {
        listItem = listItem.querySelector('[role^="menuitem"]') as HTMLElement;
      } else if (listItem.matches('[role="separator"]')) {
        listItem = listItem.previousElementSibling as HTMLElement;
        if (!listItem.matches('[role^="menuitem"]')) {
          listItem = (listItem as HTMLElement).querySelector('[role^="menuitem"]') as HTMLElement;
        }
      }
      // If listItem becomes null, this is a serious badly made UI. A
      // separator should never be the first item and groups should not be
      // empty or if unavaible just become disabled.
      listItem.focus();
    } else {
      // FIXME: It's not performant but a context menu is usually shorter than a `Tree`.
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const last: NodeListOf<HTMLElement> = event.currentTarget.querySelectorAll(
        '[role^="menuitem"]',
      );
      if (last.length > 0) {
        event.stopPropagation();
        last[last.length - 1].focus();
      }
    }
  } else if (event.key === 'ArrowDown') {
    let listItem = (event.target as HTMLElement).closest('li') as HTMLElement | null;
    if (listItem === null) {
      return;
    }
    if (listItem.nextElementSibling !== null) {
      event.stopPropagation();
      listItem = listItem.nextElementSibling as HTMLElement;

      if (listItem.matches('[role="none"]')) {
        listItem = listItem.querySelector('[role^="menuitem"]') as HTMLElement;
      } else if (listItem.matches('[role="separator"]')) {
        listItem = listItem.nextSibling as HTMLElement;
        if (!listItem.matches('[role^="menuitem"]')) {
          listItem = (listItem as HTMLElement).querySelector('[role^="menuitem"]') as HTMLElement;
        }
      }
      // If listItem becomes null, this is a serious badly made UI. A
      // separator should never be the last item and groups should not be
      // empty or if unavaible just become disabled.
      listItem.focus();
    } else {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const first: HTMLElement | null = event.currentTarget.querySelector('[role^="menuitem"]');
      if (first !== null) {
        event.stopPropagation();
        first.focus();
      }
    }
  }
}
