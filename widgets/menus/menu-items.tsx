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
    <span className="item-label">{text}</span>
    <span className="item-accelerator">{accelerator}</span>
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
    <span className="item-label">{text}</span>
    <span className="item-accelerator">{accelerator}</span>
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
    <span className="item-label">{text}</span>
    <span className="item-accelerator">{accelerator}</span>
  </li>
);

export interface IMenuSliderItem {
  value: number;
  onChange: (val: number) => void;
  min: number;
  max: number;
}

export const MenuSliderItem = ({ value, onChange, min, max }: IMenuSliderItem) => (
  <li role="menuitemslider" tabIndex={-1}>
    <div className="slider">
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  </li>
);

export const MenuDivider = () => <li role="separator" className="menu-separator"></li>;

export interface IMenuItemLink {
  icon?: JSX.Element;
  text: string;
  disabled?: boolean;
  expanded: boolean;
}

export const MenuItemLink = ({ expanded, disabled, icon, text }: IMenuItemLink) => {
  return (
    <a
      tabIndex={-1}
      role="menuitem"
      aria-haspopup="menu"
      aria-expanded={expanded}
      aria-disabled={disabled}
      href="#"
    >
      <span className="item-icon" aria-hidden>
        {icon}
      </span>
      <span className="item-label">{text}</span>
      <span className="item-accelerator">{IconSet.ARROW_RIGHT}</span>
    </a>
  );
};
