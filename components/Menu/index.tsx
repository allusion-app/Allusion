import './menu.scss';
import React from 'react';
import { observer } from 'mobx-react-lite';

const setTabFocus = (element: HTMLElement) => {
  element.setAttribute('tabIndex', '0');
  element.focus({ preventScroll: true }); // CHROME BUG: Option is ignored, probably fixed in Electron 9.
};

const refocus = (previousTarget: Element, nextTarget: HTMLElement) => {
  previousTarget.setAttribute('tabIndex', '-1');
  setTabFocus(nextTarget);
};

const handleFocus = (event: React.FocusEvent<HTMLUListElement>) => {
  if (!event.target.getAttribute('role')?.startsWith('menuitem')) {
    return;
  }
  const prev = event.currentTarget.querySelector('li[role^="menuitem"][tabindex="0"]');
  if (prev) {
    if (event.target !== prev) {
      refocus(prev as HTMLElement, event.target);
    }
  } else {
    setTabFocus(event.target);
  }
};

const handleClick = (e: React.MouseEvent) => {
  if ((e.target as Element).getAttribute('role')?.startsWith('menuitem')) {
    const dialog = e.currentTarget.closest('dialog') as HTMLDialogElement;
    (dialog.previousElementSibling as HTMLElement).focus();
    dialog.close();
  }
};

interface IMenuFlyout {
  id: string;
  children: React.ReactNode;
  labelledby: string;
  /** @default menu */
  role?: 'menu' | 'group';
}

const MenuFlyout = observer(({ id, children, labelledby, role = 'menu' }: IMenuFlyout) => {
  return (
    <ul
      id={id}
      role={role}
      aria-labelledby={labelledby}
      className="menu"
      onClick={handleClick}
      onFocus={handleFocus}
    >
      {children}
    </ul>
  );
});

/** Does not support sub menus yet */
interface IMenuItem {
  icon?: JSX.Element;
  text: string;
  accelerator?: JSX.Element;
  onClick: (event: React.MouseEvent<HTMLElement>) => void;
}

const MenuItem = observer(({ text, icon, onClick, accelerator }: IMenuItem) => {
  return (
    <li className="menuitem" role="menuitem" tabIndex={-1} onClick={onClick}>
      <span className="menuitem-icon" aria-hidden>
        {icon}
      </span>
      {text}
      <span className="menuitem-accelerator custom-icon" aria-hidden>
        {accelerator}
      </span>
    </li>
  );
});

interface IMenuRadioItem extends IMenuItem {
  checked: boolean;
}

const MenuRadioItem = observer(({ text, icon, checked, onClick, accelerator }: IMenuRadioItem) => {
  return (
    <li
      className="menuitem"
      role="menuitemradio"
      aria-checked={checked}
      tabIndex={-1}
      onClick={onClick}
    >
      <span className="menuitem-icon" aria-hidden>
        {icon}
      </span>
      {text}
      <span className="menuitem-accelerator  custom-icon" aria-hidden>
        {accelerator}
      </span>
    </li>
  );
});

type IMenuCheckboxItem = Omit<IMenuRadioItem, 'icon'>;

const MenuCheckboxItem = observer(({ text, checked, onClick, accelerator }: IMenuCheckboxItem) => {
  return (
    <li
      className="menuitem"
      role="menuitemcheckbox"
      aria-checked={checked}
      tabIndex={-1}
      onClick={onClick}
    >
      <span className="menuitem-icon custom-icon" aria-hidden></span>
      {text}
      <span className="menuitem-accelerator custom-icon" aria-hidden>
        {accelerator}
      </span>
    </li>
  );
});

export { MenuCheckboxItem, MenuFlyout, MenuItem, MenuRadioItem };
