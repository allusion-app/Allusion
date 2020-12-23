import React from 'react';

import { IconSet } from '../Icons';

export interface IMenuItem {
  icon?: JSX.Element;
  text: string;
  accelerator?: JSX.Element;
  onClick: (event: React.MouseEvent<HTMLElement>) => void;
  disabled?: boolean;
}

export const MenuItem = ({ text, icon, onClick, accelerator, disabled }: IMenuItem) => (
  <li
    role="menuitem"
    tabIndex={-1}
    onClick={disabled ? undefined : onClick}
    aria-disabled={disabled}
  >
    <span className="item-icon" aria-hidden>
      {icon}
    </span>
    {text}
    <span className="item-accelerator" aria-hidden>
      {accelerator}
    </span>
  </li>
);

export interface IMenuRadioItem extends IMenuItem {
  checked: boolean;
}

export const MenuRadioItem = ({
  text,
  icon,
  checked,
  onClick,
  accelerator,
  disabled,
}: IMenuRadioItem) => (
  <li
    role="menuitemradio"
    aria-checked={checked}
    tabIndex={-1}
    onClick={disabled ? undefined : onClick}
    aria-disabled={disabled}
  >
    <span className="item-icon" aria-hidden>
      {icon}
    </span>
    {text}
    <span className="item-accelerator" aria-hidden>
      {accelerator}
    </span>
  </li>
);

export type IMenuCheckboxItem = Omit<IMenuRadioItem, 'icon'>;

export const MenuCheckboxItem = ({
  text,
  checked,
  onClick,
  accelerator,
  disabled,
}: IMenuCheckboxItem) => (
  <li
    role="menuitemcheckbox"
    aria-checked={checked}
    tabIndex={-1}
    onClick={disabled ? undefined : onClick}
    aria-disabled={disabled}
  >
    <span className="item-icon" aria-hidden></span>
    {text}
    <span className="item-accelerator" aria-hidden>
      {accelerator}
    </span>
  </li>
);

export const MenuDivider = () => <li role="separator" className="menu-separator"></li>;

export interface IMenuItemLink {
  icon?: JSX.Element;
  text: string;
  disabled?: boolean;
  expanded: boolean;
  setExpanded: React.Dispatch<React.SetStateAction<boolean>>;
}

export const MenuItemLink = ({ expanded, setExpanded, disabled, icon, text }: IMenuItemLink) => {
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  const handleMouseEnter = (e: React.MouseEvent<HTMLElement>) => {
    if (!disabled) {
      e.currentTarget.focus();
      setExpanded(true);
    }
  };

  const handleMouseLeave = (e: React.MouseEvent<HTMLElement>) => {
    if (!(e.currentTarget.parentElement as HTMLElement).contains(e.relatedTarget as Node)) {
      setExpanded(false);
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
        setExpanded(true);
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
      aria-expanded={expanded}
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
