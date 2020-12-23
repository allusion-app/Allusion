import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';

import { IconSet } from '../Icons';
import { RawPopover } from '../popover/RawPopover';

export interface ISubMenu {
  icon?: JSX.Element;
  text: string;
  disabled?: boolean;
  children: React.ReactNode;
}

export const SubMenu = ({ text, icon, disabled, children }: ISubMenu) => {
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

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      setIsOpen(false);
      // Returns focus to the anchor element.
      const target = e.currentTarget.previousElementSibling as HTMLElement;
      target.focus();
    }
  }, []);

  return (
    <li
      role="none"
      onClick={open}
      onMouseEnter={open}
      onMouseLeave={close}
      onBlur={handleFlyoutBlur}
    >
      <RawPopover
        popoverRef={menu}
        isOpen={isOpen}
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
        container="ul"
        placement="right-start"
        fallbackPlacements={['right-end', 'right']}
        data-submenu
        role="menu"
        aria-label={text}
        className="menu"
        onClick={handleClick}
        onFocus={handleFocus}
        onMouseEnter={open}
        onMouseLeave={handleMouseLeave}
        onKeyDown={handleKeyDown}
      >
        {children}
      </RawPopover>
    </li>
  );
};

const handleFlyoutBlur = (e: React.FocusEvent) =>
  (e.currentTarget.firstElementChild as HTMLAnchorElement).focus();

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
