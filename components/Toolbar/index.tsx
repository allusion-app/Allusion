/* eslint-disable @typescript-eslint/no-non-null-assertion */
import './toolbar.scss';
import React, { useEffect, useRef, useState } from 'react';
import { Tooltip, Flyout } from '../Dialog/index';
import { observer } from 'mobx-react-lite';

interface IToolbar {
  children: React.ReactNode;
  id?: string;
  className?: string;
  label?: string;
  labelledby?: string;
  controls: string;
  orientation?: 'horizontal' | 'vertical';
}

const handleToolbarKeyDown = (e: React.KeyboardEvent<HTMLElement>) => {
  const current = e.currentTarget;
  const target = (e.target as HTMLElement).closest('[role="toolbar"] > *')!;
  const isVertical = current.matches('[aria-orientation="vertical"]');

  if (isVertical && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
    return;
  }

  let item;
  if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
    item = target.previousElementSibling ?? current.lastElementChild!;
    if (!item.matches('.toolbar-item')) {
      item = item.querySelector('.toolbar-item:last-child')!;
    }
  } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
    item = target.nextElementSibling ?? current.querySelector('.toolbar-item');
    if (item && !item.matches('.toolbar-item')) {
      item = item.querySelector('.toolbar-item');
    }
  } else if (e.key === 'Home') {
    item = current.querySelector('.toolbar-item');
  } else if (e.key === 'End') {
    item = current.lastElementChild!;
    if (!item.matches('.toolbar-item')) {
      item = item.querySelector('.toolbar-item:last-child')!;
    }
  }

  if (item) {
    e.stopPropagation();
    (item as HTMLElement).focus();
  }
};

const handleToolbarFocus = (e: React.FocusEvent<HTMLElement>) => {
  if (e.target.matches('.toolbar-item')) {
    e.currentTarget.querySelector('.toolbar-item[tabindex="0"]')?.setAttribute('tabIndex', '-1');
    e.target.setAttribute('tabIndex', '0');
  }
};

const Toolbar = (props: IToolbar) => {
  const { children, id, className, label, labelledby, controls, orientation } = props;
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
      className={className}
      aria-label={label}
      aria-labelledby={labelledby}
      aria-controls={controls}
      aria-orientation={orientation}
      onFocus={handleToolbarFocus}
      onKeyDown={handleToolbarKeyDown}
    >
      {children}
    </div>
  );
};

interface IBaseButton {
  id?: string;
  text: React.ReactText;
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
  expanded?: boolean;
  controls?: string;
  haspopup?: boolean | 'menu' | 'listbox' | 'tree' | 'grid' | 'dialog';
}

const ToolbarButton = observer((props: IToolbarButton) => {
  const {
    id,
    onClick,
    icon,
    text,
    role,
    pressed,
    checked,
    disabled,
    tooltip,
    showLabel,
    expanded,
    controls,
    haspopup,
  } = props;
  const content = (
    <span className="toolbar-button-content">
      <span className="toolbar-button-icon" aria-hidden>
        {icon}
      </span>
      <span className={`toolbar-button-text ${showLabel ?? ''}`}>{text}</span>
    </span>
  );
  return (
    <button
      id={id}
      className="toolbar-item toolbar-button"
      onClick={disabled ? undefined : onClick}
      role={role}
      aria-pressed={pressed}
      aria-checked={checked}
      aria-disabled={disabled}
      aria-controls={controls}
      aria-haspopup={haspopup}
      aria-expanded={expanded}
      tabIndex={-1}
    >
      {tooltip ? (
        <Tooltip content={tooltip} hoverDelay={1500}>
          {content}
        </Tooltip>
      ) : (
        content
      )}
    </button>
  );
});

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
  const isVertical = e.currentTarget.matches('[aria-orientation="vertical"]');

  if (isVertical && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
    return;
  }

  let item;
  if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
    item = target.nextElementSibling ?? target.parentElement!.nextElementSibling;
    if (item && !item.matches('.toolbar-item')) {
      item = item.querySelector('.toolbar-item');
    }
  } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
    item = target.previousElementSibling ?? target.parentElement!.previousElementSibling;
    if (item) {
      if (item.matches('.toolbar-group')) {
        item = item.lastElementChild!;
      }
      if (!item.matches('.toolbar-item')) {
        item = item.querySelector('.toolbar-item:last-child');
      }
    }
  }
  if (item) {
    e.stopPropagation();
    (item as HTMLElement).focus();
  }
};

const ToolbarGroup = observer((props: IToolbarGroup) => {
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

const ToolbarToggleButton = (props: IToolbarToggleButton) => {
  const { id, pressed, onClick, icon, text, tooltip, showLabel } = props;
  return (
    <ToolbarButton
      id={id}
      pressed={pressed}
      onClick={onClick}
      icon={icon}
      text={text}
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
  const isVertical = e.currentTarget.matches('[aria-orientation="vertical"]');
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

const ToolbarSegment = ({ label, children, showLabel }: IToolbarSegment) => {
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

const ToolbarSegmentButton = (props: IToolbarSegmentButton) => {
  const { id, checked, onClick, icon, text, tooltip, showLabel } = props;
  return (
    <ToolbarButton
      id={id}
      role="radio"
      checked={checked}
      onClick={onClick}
      icon={icon}
      text={text}
      tooltip={tooltip}
      showLabel={showLabel}
    />
  );
};

const handleKeyDown = (e: React.KeyboardEvent) => {
  switch (e.key) {
    case 'Enter': {
      const item = e.currentTarget.querySelector('dialog [tabindex="0"]:focus') as HTMLElement;
      if (item) {
        e.stopPropagation();
        item.click();
        e.currentTarget.querySelector('button')?.focus();
      }
      break;
    }

    case 'Escape':
      const item = e.currentTarget.querySelector('dialog [tabindex="0"]:focus') as HTMLElement;
      if (item) {
        e.stopPropagation();
        item.blur();
        e.currentTarget.querySelector('button')?.focus();
      }
      break;

    default:
      break;
  }
};

const handleFlyoutBlur = (e: React.FocusEvent) => {
  if (!e.currentTarget.contains(e.relatedTarget as Node)) {
    const dialog = e.currentTarget.lastElementChild as HTMLDialogElement;
    if (dialog.open) {
      dialog.close();
    }
  }
};

interface IToolbarMenuButton extends IBaseButton {
  controls: string;
  /** The element must be a Menu component otherwise focus will not work. */
  children: React.ReactNode;
  disabled?: boolean;
  /** @default 'menu' */
  role?: 'menu' | 'group';
}

const ToolbarMenuButton = observer((props: IToolbarMenuButton) => {
  const [isOpen, setIsOpen] = useState(false);
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (container.current && isOpen) {
      // Focus first focusable menu item
      const first = container.current.querySelector('[role^="menuitem"]') as HTMLElement;
      // The Menu component will handle setting the tab indices.
      first?.focus();
    }
  }, [isOpen]);

  return (
    <div ref={container} onKeyDown={handleKeyDown} onBlur={handleFlyoutBlur}>
      <Flyout
        open={isOpen}
        onClose={() => setIsOpen(false)}
        onCancel={() => setIsOpen(false)}
        target={
          <ToolbarButton
            id={props.id}
            icon={props.icon}
            text={props.text}
            disabled={props.disabled}
            showLabel={props.showLabel}
            tooltip={props.tooltip}
            onClick={() => setIsOpen(!isOpen)}
            expanded={isOpen}
            controls={props.controls}
            haspopup="menu"
          />
        }
      >
        {props.children}
      </Flyout>
    </div>
  );
});

export {
  Toolbar,
  ToolbarGroup,
  ToolbarButton,
  ToolbarMenuButton,
  ToolbarSegment,
  ToolbarSegmentButton,
  ToolbarToggleButton,
};
