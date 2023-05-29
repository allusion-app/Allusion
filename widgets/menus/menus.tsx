import React, { ForwardedRef, forwardRef, useLayoutEffect, useState } from 'react';

import { usePopover } from '../popovers/usePopover';
import {
  MenuCheckboxItemProps,
  MenuItemLink,
  MenuItemLinkProps,
  MenuItemProps,
  MenuRadioItemProps,
} from './menu-items';

export type MenuProps = {
  id?: string;
  children: MenuChildren;
  label?: string;
  labelledby?: string;
};

export type MenuChildren = MenuChild | MenuChild[] | React.ReactFragment;

export type MenuChild =
  | React.ReactElement<MenuCheckboxItemProps>
  | React.ReactElement<MenuItemProps>
  | React.ReactElement<MenuItemLinkProps>
  | React.ReactElement<MenuRadioGroupProps>
  | React.ReactElement<MenuRadioGroupProps>
  | React.ReactElement<MenuSubItemProps>;

export const Menu = forwardRef(function Menu(
  { id, children, label, labelledby }: MenuProps,
  ref: ForwardedRef<HTMLUListElement>,
) {
  return (
    <ul
      ref={ref}
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
});

export type MenuSubItemProps = {
  icon?: JSX.Element;
  text: string;
  disabled?: boolean;
  children: React.ReactNode;
};

export const MenuSubItem = ({ text, icon, disabled, children }: MenuSubItemProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const { style, reference, floating, update } = usePopover('right-start', [
    'right',
    'right-end',
    'left-start',
    'left',
    'left-end',
  ]);

  useLayoutEffect(() => {
    if (isOpen) {
      update();
    }
  }, [isOpen, update]);

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
      const first: HTMLElement | null =
        e.currentTarget.lastElementChild!.querySelector('[role^="menuitem"]');
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
      <MenuItemLink ref={reference} expanded={isOpen} text={text} icon={icon} disabled={disabled} />
      <ul
        ref={floating}
        data-popover
        data-open={isOpen}
        style={style}
        role="menu"
        aria-label={text}
        className="menu"
      >
        {children}
      </ul>
    </li>
  );
};

export type MenuRadioGroupProps = {
  children: React.ReactElement<MenuRadioItemProps>[];
  label?: string;
};

export const MenuRadioGroup = ({ children, label }: MenuRadioGroupProps) => (
  <li role="none">
    <ul role="group" aria-label={label} onKeyDown={handleMenuKeyDown}>
      {children}
    </ul>
  </li>
);

function handleFocus(event: React.FocusEvent) {
  const liTarget = event.target.closest('[role^="menuitem"]') as HTMLElement | null;
  // If no target found, or target is an input element, ignore
  // (needed for input elements inside of menu items, e.g. sliders)
  if (liTarget === null || document.activeElement?.tagName === 'INPUT') {
    return;
  }

  const previous: HTMLElement | null = event.currentTarget.querySelector(
    '[role^="menuitem"][tabindex="0"]',
  );
  if (previous !== null) {
    previous.tabIndex = -1;
  }
  liTarget.tabIndex = 0;
  // target.focus({ preventScroll: true }); // CHROME BUG: Option is ignored, probably fixed in Electron 9.
  liTarget.focus();
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
      const last: NodeListOf<HTMLElement> =
        event.currentTarget.querySelectorAll('[role^="menuitem"]');
      if (last.length > 0) {
        event.stopPropagation();
        last[last.length - 1].focus();
      }
    }
    event.preventDefault();
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
    event.preventDefault();
  }
}
