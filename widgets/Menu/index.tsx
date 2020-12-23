import './menu.scss';
import React from 'react';

export interface IMenu {
  id?: string;
  children: React.ReactNode;
  label?: string;
  labelledby?: string;
}

const Menu = ({ id, children, label, labelledby }: IMenu) => (
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

interface IMenuItem {
  icon?: JSX.Element;
  text: string;
  accelerator?: JSX.Element;
  onClick: (event: React.MouseEvent<HTMLElement>) => void;
  disabled?: boolean;
}

const MenuItem = ({ text, icon, onClick, accelerator, disabled }: IMenuItem) => (
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

interface IMenuRadioGroup {
  children: React.ReactElement<IMenuRadioItem>[];
  label?: string;
}

const MenuRadioGroup = ({ children, label }: IMenuRadioGroup) => (
  <li role="none">
    <ul role="group" aria-label={label}>
      {children}
    </ul>
  </li>
);

interface IMenuRadioItem extends IMenuItem {
  checked: boolean;
}

const MenuRadioItem = ({ text, icon, checked, onClick, accelerator, disabled }: IMenuRadioItem) => (
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

type IMenuCheckboxItem = Omit<IMenuRadioItem, 'icon'>;

const MenuCheckboxItem = ({ text, checked, onClick, accelerator, disabled }: IMenuCheckboxItem) => (
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

const MenuDivider = () => <li role="separator" className="menu-separator"></li>;

export { Menu, MenuCheckboxItem, MenuDivider, MenuItem, MenuRadioGroup, MenuRadioItem };

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
