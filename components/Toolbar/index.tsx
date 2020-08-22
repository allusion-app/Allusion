/* eslint-disable @typescript-eslint/no-non-null-assertion */
import './toolbar.scss';
import React, { useEffect, useRef } from 'react';
import { Tooltip } from '@blueprintjs/core';
import { observer } from 'mobx-react-lite';

interface IToolbar {
  children: React.ReactNode;
  id?: string;
  className?: string;
  label?: string;
  labelledBy?: string;
  controls: string;
  orientation?: 'horizontal' | 'vertical';
}

const handleToolbarKeyDown = (e: React.KeyboardEvent<HTMLElement>) => {
  const current = e.currentTarget;
  const target = (e.target as HTMLElement).closest('.toolbar > *')!;
  const isVertical = current.getAttribute('aria-orientation') === 'vertical';

  if (isVertical && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
    return;
  }

  let item;
  if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
    item = target.previousElementSibling ?? current.lastElementChild!;
    if (!item.classList.contains('toolbar-item')) {
      item = item.querySelector('.toolbar-item:last-child')!;
    }
  } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
    item = target.nextElementSibling ?? current.querySelector('.toolbar-item');
    if (item && !item.classList.contains('toolbar-item')) {
      item = item.querySelector('.toolbar-item');
    }
  } else if (e.key === 'Home') {
    item = current.querySelector('.toolbar-item');
  } else if (e.key === 'End') {
    item = current.lastElementChild!;
    if (!item.classList.contains('toolbar-item')) {
      item = item.querySelector('.toolbar-item:last-child')!;
    }
  }

  if (item) {
    e.stopPropagation();
    (item as HTMLElement).focus();
  }
};

const handleToolbarFocus = (e: React.FocusEvent<HTMLElement>) => {
  if (e.target.classList.contains('toolbar-item')) {
    e.currentTarget.querySelector('.toolbar-item[tabindex="0"]')?.setAttribute('tabIndex', '-1');
    e.target.setAttribute('tabIndex', '0');
  }
};

const Toolbar = (props: IToolbar) => {
  const { children, id, className, label, labelledBy, controls, orientation } = props;
  const toolbar = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (toolbar.current) {
      toolbar.current.querySelector('.toolbar-item')?.setAttribute('tabIndex', '0');
    }
  }, []);

  useEffect(() => {
    if (toolbar.current) {
      const list = toolbar.current.querySelectorAll('.toolbar-group');
      if (orientation) {
        list.forEach((group) => group.setAttribute('aria-orientation', orientation));
      } else {
        list.forEach((group) => group.removeAttribute('aria-orientation'));
      }
    }
  }, [orientation]);

  return (
    <div
      ref={toolbar}
      role="toolbar"
      id={id}
      className={`toolbar ${className ?? ''}`}
      aria-label={label}
      aria-labelledby={labelledBy}
      aria-controls={controls}
      aria-orientation={orientation}
      onFocus={handleToolbarFocus}
      onKeyDown={handleToolbarKeyDown}
    >
      {children}
    </div>
  );
};

export default Toolbar;

interface IBaseButton {
  label: string;
  icon: JSX.Element;
  onClick?: (event: React.MouseEvent) => void;
  showLabel?: 'always' | 'never';
  tooltip?: string;
}

interface IToolbarButton extends IBaseButton {
  role?: string;
  disabled?: boolean;
  pressed?: boolean;
  checked?: boolean;
}

export const ToolbarButton = observer(
  ({
    onClick,
    icon,
    label,
    role,
    pressed,
    checked,
    disabled,
    tooltip,
    showLabel,
  }: IToolbarButton) => {
    const content = (
      <span className="toolbar-button-content">
        <span className="toolbar-button-icon" aria-hidden="true">
          {icon}
        </span>
        <span className={`toolbar-button-label ${showLabel ?? ''}`}>{label}</span>
      </span>
    );
    return (
      <button
        className="toolbar-item toolbar-button"
        onClick={onClick}
        role={role}
        aria-pressed={pressed}
        aria-checked={checked}
        aria-disabled={disabled}
        tabIndex={-1}
      >
        {tooltip ? (
          <Tooltip
            content={tooltip}
            usePortal={false}
            openOnTargetFocus={false}
            hoverOpenDelay={1000}
          >
            {content}
          </Tooltip>
        ) : (
          content
        )}
      </button>
    );
  },
);

interface IBaseGroup {
  children: React.ReactNode;
  showLabel?: 'always' | 'never';
}

interface IToolbarGroup extends IBaseGroup {
  id?: string;
  label?: string;
  role?: string;
  onKeyDown?: (e: React.KeyboardEvent<HTMLElement>) => void;
}

const handleGroupKeyDown = (e: React.KeyboardEvent<HTMLElement>) => {
  const target = (e.target as HTMLElement).closest('.toolbar-group > *')!;
  const isVertical = e.currentTarget.getAttribute('aria-orientation') === 'vertical';

  if (isVertical && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
    return;
  }

  let item;
  if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
    item = target.nextElementSibling ?? target.parentElement!.nextElementSibling;
    if (item && !item.classList.contains('toolbar-item')) {
      item = item.querySelector('.toolbar-item');
    }
  } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
    item = target.previousElementSibling ?? target.parentElement!.previousElementSibling;
    if (item) {
      if (item.classList.contains('toolbar-group')) {
        item = item.lastElementChild!;
      }
      if (!item.classList.contains('toolbar-item')) {
        item = item.querySelector('.toolbar-item:last-child');
      }
    }
  }
  if (item) {
    e.stopPropagation();
    (item as HTMLElement).focus();
  }
};

export const ToolbarGroup = observer((props: IToolbarGroup) => {
  const { id, label, children, role, showLabel, onKeyDown = handleGroupKeyDown } = props;
  return (
    <div
      id={id}
      className={`toolbar-group ${showLabel ?? ''}`}
      role={role}
      aria-label={label}
      onKeyDown={onKeyDown}
    >
      {children}
    </div>
  );
});

interface IToolbarToggleButton extends IBaseButton {
  pressed: boolean;
}

export const ToolbarToggleButton = (props: IToolbarToggleButton) => {
  const { pressed, onClick, icon, label, tooltip, showLabel } = props;
  return (
    <ToolbarButton
      pressed={pressed}
      onClick={onClick}
      icon={icon}
      label={label}
      showLabel={showLabel}
      tooltip={tooltip}
    />
  );
};

interface IToolbarSegment extends IBaseGroup {
  label: string;
}

const handleSegmentKeyDown = (e: React.KeyboardEvent<HTMLElement>) => {
  const target = e.target as HTMLElement;
  const isVertical = e.currentTarget.getAttribute('aria-orientation') === 'vertical';
  let item;
  if (e.key === 'ArrowLeft' || (isVertical && e.key === 'ArrowUp')) {
    item = target.previousElementSibling;
  } else if (e.key === 'ArrowRight' || (isVertical && e.key === 'ArrowDown')) {
    item = target.nextElementSibling;
  } else if (e.key === 'ArrowDown' || (isVertical && e.key === 'ArrowLeft')) {
    item = target.nextElementSibling ?? e.currentTarget.firstElementChild;
  } else if (e.key === 'ArrowUp' || (isVertical && e.key === 'ArrowRight')) {
    item = target.previousElementSibling ?? e.currentTarget.lastElementChild;
  }
  if (item) {
    e.stopPropagation();
    (item as HTMLElement).focus();
  }
};

export const ToolbarSegment = ({ label, children, showLabel }: IToolbarSegment) => {
  return (
    <ToolbarGroup
      role="radiogroup"
      label={label}
      showLabel={showLabel}
      onKeyDown={handleSegmentKeyDown}
    >
      {children}
    </ToolbarGroup>
  );
};

interface IToolbarSegmentButton extends IBaseButton {
  checked: boolean;
}

export const ToolbarSegmentButton = (props: IToolbarSegmentButton) => {
  const { checked, onClick, icon, label, tooltip, showLabel } = props;
  return (
    <ToolbarButton
      role="radio"
      checked={checked}
      onClick={onClick}
      icon={icon}
      label={label}
      tooltip={tooltip}
      showLabel={showLabel}
    />
  );
};
