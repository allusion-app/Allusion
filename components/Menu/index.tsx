import './menu.scss';
import React, { useState } from 'react';
import { observer } from 'mobx-react-lite';
import IconSet from '../Icons';
import { Flyout } from '../Dialog';

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
  if ((e.target as Element).matches('[role^="menuitem"]')) {
    const dialog = e.currentTarget.closest('dialog') as HTMLDialogElement;
    (dialog.previousElementSibling as HTMLElement)?.focus();
    dialog.close();
  }
};

interface IMenu {
  id?: string;
  children: React.ReactNode;
  label?: string;
  labelledby?: string;
  /** @default 'menu' */
  role?: 'menu' | 'group';
}

const Menu = observer(({ id, children, label, labelledby, role = 'menu' }: IMenu) => {
  return (
    <ul
      id={id}
      role={role}
      aria-label={label}
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
  disabled?: boolean;
}

const MenuItem = observer(({ text, icon, onClick, accelerator, disabled }: IMenuItem) => {
  return (
    <li
      className="menuitem"
      role="menuitem"
      tabIndex={-1}
      onClick={disabled ? undefined : onClick}
      aria-disabled={disabled}
    >
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

const MenuRadioItem = observer(
  ({ text, icon, checked, onClick, accelerator, disabled }: IMenuRadioItem) => {
    return (
      <li
        className="menuitem"
        role="menuitemradio"
        aria-checked={checked}
        tabIndex={-1}
        onClick={disabled ? undefined : onClick}
        aria-disabled={disabled}
      >
        <span className="menuitem-icon" aria-hidden>
          {icon}
        </span>
        {text}
        <span className="menuitem-accelerator custom-icon" aria-hidden>
          {accelerator}
        </span>
      </li>
    );
  },
);

type IMenuCheckboxItem = Omit<IMenuRadioItem, 'icon'>;

const MenuCheckboxItem = observer(
  ({ text, checked, onClick, accelerator, disabled }: IMenuCheckboxItem) => {
    return (
      <li
        className="menuitem"
        role="menuitemcheckbox"
        aria-checked={checked}
        tabIndex={-1}
        onClick={disabled ? undefined : onClick}
        aria-disabled={disabled}
      >
        <span className="menuitem-icon custom-icon" aria-hidden></span>
        {text}
        <span className="menuitem-accelerator custom-icon" aria-hidden>
          {accelerator}
        </span>
      </li>
    );
  },
);

const MenuDivider = () => <li role="separator" className="menu-separator"></li>;

const handleFlyoutBlur = (e: React.FocusEvent) => {
  const { currentTarget: target, relatedTarget: nextTarget } = e;
  if (!(target.matches('li[role="none"]') || target.contains(nextTarget as Node))) {
    const dialog = target.lastElementChild as HTMLDialogElement;
    if (dialog.open) {
      dialog.close();
    }
  }
};

interface ISubMenu {
  icon?: JSX.Element;
  text: string;
  disabled?: boolean;
  children: React.ReactNode;
  /** @default 'menu' */
  role?: 'menu' | 'group';
}

const SubMenu = observer(({ text, icon, disabled, children, role = 'menu' }: ISubMenu) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <li
      role="none"
      onClick={() => setIsOpen(true)}
      onBlur={handleFlyoutBlur}
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
    >
      <Flyout
        open={isOpen}
        placement="right-start"
        onClose={() => setIsOpen(false)}
        target={
          <a
            className="menuitem"
            tabIndex={-1}
            role="menuitem"
            aria-haspopup
            aria-expanded="false"
            aria-disabled={disabled}
            href="#"
          >
            <span className="menuitem-icon" aria-hidden>
              {icon}
            </span>
            {text}
            <span className="menuitem-accelerator custom-icon" aria-hidden>
              {IconSet.ARROW_RIGHT}
            </span>
          </a>
        }
      >
        <ul
          role={role}
          aria-label={text}
          className="menu"
          onClick={handleClick}
          onFocus={handleFocus}
          onMouseEnter={() => setIsOpen(true)}
          onMouseLeave={(e) => {
            // Close sub menu only if the new target is not the menu item parent!
            if (!(e.relatedTarget as Element).matches('li[role="none"]')) {
              setIsOpen(false);
            }
          }}
        >
          {children}
        </ul>
      </Flyout>
    </li>
  );
});

export { Menu, MenuCheckboxItem, MenuDivider, MenuItem, MenuRadioItem, SubMenu };
