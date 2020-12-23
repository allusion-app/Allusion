import './menu.scss';
import React from 'react';

interface IMenu {
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
    onClick={handleMenuClick}
    onFocus={handleFocus}
    onBlur={handleBlur}
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
    <ul
      role="group"
      aria-label={label}
      onClick={handleClick}
      onFocus={handleFocus}
      onBlur={handleBlur}
    >
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

const handleBlur = (e: React.FocusEvent) => {
  if (
    (e.relatedTarget as Element)?.closest('[role="menu"][data-submenu]') ||
    e.target.closest('[role="menu"][data-submenu]')
  ) {
    e.stopPropagation();
  }
};

const handleFocus = (event: React.FocusEvent<HTMLUListElement>) => {
  if (!event.target.matches('[role^="menuitem"]')) {
    return;
  }
  const prev = event.currentTarget.querySelectorAll('[role^="menuitem"][tabindex="0"]');
  if (prev.length > 0) {
    prev.forEach((p) => p.setAttribute('tabIndex', '-1'));
  }
  event.target.setAttribute('tabIndex', '0');
  event.target.focus({ preventScroll: true }); // CHROME BUG: Option is ignored, probably fixed in Electron 9.
};

const handleClick = (e: React.MouseEvent) => {
  if ((e.target as Element).matches('li[role^="menuitem"]')) {
    const dialog = e.currentTarget.closest('dialog') as HTMLDialogElement;
    (dialog.previousElementSibling as HTMLElement)?.focus();
    dialog.close();
  }
};

const handleMenuClick = (e: React.MouseEvent) => {
  e.stopPropagation();
  handleClick(e);
};
