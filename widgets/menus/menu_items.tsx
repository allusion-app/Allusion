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
