import './menu.scss';
import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { observer } from 'mobx-react-lite';
import { IconSet } from '../Icons';
import { Flyout } from '../Dialog';

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

type MenuChild = React.ReactElement<IMenuRadioGroup | ISubMenu | IMenuItem>;
type MenuChildren = MenuChild | MenuChild[];

interface IMenu {
  id?: string;
  children: MenuChildren;
  label?: string;
  labelledby?: string;
}

const Menu = observer(({ id, children, label, labelledby }: IMenu) => (
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
));

interface IMenuItem {
  icon?: JSX.Element;
  text: string;
  accelerator?: JSX.Element;
  onClick: (event: React.MouseEvent<HTMLElement>) => void;
  disabled?: boolean;
}

const MenuItem = observer(({ text, icon, onClick, accelerator, disabled }: IMenuItem) => (
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
));

interface IMenuRadioGroup {
  children: React.ReactElement<IMenuRadioItem>[];
  label?: string;
}

const MenuRadioGroup = observer(({ children, label }: IMenuRadioGroup) => (
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
));

interface IMenuRadioItem extends IMenuItem {
  checked: boolean;
}

const MenuRadioItem = observer(
  ({ text, icon, checked, onClick, accelerator, disabled }: IMenuRadioItem) => (
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
  ),
);

type IMenuCheckboxItem = Omit<IMenuRadioItem, 'icon'>;

const MenuCheckboxItem = observer(
  ({ text, checked, onClick, accelerator, disabled }: IMenuCheckboxItem) => (
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
  ),
);

const MenuDivider = () => <li role="separator" className="menu-separator"></li>;

const handleFlyoutBlur = (e: React.FocusEvent) =>
  (e.currentTarget.firstElementChild as HTMLAnchorElement).focus();

interface ISubMenu {
  icon?: JSX.Element;
  text: string;
  disabled?: boolean;
  children: MenuChildren;
}

import { Placement } from '@popperjs/core/lib/enums';

const subMenuPlacments = ['right-end', 'right'] as Placement[];

const SubMenu = observer(({ text, icon, disabled, children }: ISubMenu) => {
  const [isOpen, setIsOpen] = useState(false);
  const menu = useRef<HTMLUListElement>(null);

  const open = useMemo(() => (disabled ? undefined : () => setIsOpen(true)), [disabled]);
  const close = useMemo(() => (disabled ? undefined : () => setIsOpen(false)), [disabled]);
  const handleMouseLeave = useCallback((e: React.MouseEvent<HTMLUListElement>) => {
    if (!(e.relatedTarget as Element).matches('li[role="none"]')) {
      setIsOpen(false);
    }
  }, []);

  useEffect(() => {
    if (menu.current && isOpen) {
      const first = menu.current.querySelector('[role^="menuitem"]') as HTMLElement;
      // The Menu component will handle setting the tab indices.
      first?.focus();
    }
  });

  return (
    <li
      role="none"
      onClick={open}
      onMouseEnter={open}
      onMouseLeave={close}
      onBlur={handleFlyoutBlur}
    >
      <Flyout
        open={isOpen}
        placement="right-start"
        fallbackPlacements={subMenuPlacments}
        onClose={close}
        target={
          <a
            tabIndex={-1}
            role="menuitem"
            aria-haspopup="menu"
            aria-expanded="false"
            aria-disabled={disabled}
            href="#"
          >
            <span className="item-icon" aria-hidden>
              {icon}
            </span>
            {text}
            <span className="item-accelerator" aria-hidden>
              {IconSet.ARROW_RIGHT}
            </span>
          </a>
        }
      >
        <ul
          data-submenu
          ref={menu}
          role="menu"
          aria-label={text}
          className="menu"
          onClick={handleClick}
          onFocus={handleFocus}
          onMouseEnter={open}
          onMouseLeave={handleMouseLeave}
        >
          {children}
        </ul>
      </Flyout>
    </li>
  );
});

export { Menu, MenuCheckboxItem, MenuDivider, MenuItem, MenuRadioGroup, MenuRadioItem, SubMenu };
