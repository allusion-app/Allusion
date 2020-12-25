import './toolbar.scss';
import React, { useEffect, useRef, useState } from 'react';

import { Tooltip } from '../popovers';
import { RawPopover } from '../popovers/RawPopover';

interface IToolbar {
  children: React.ReactNode;
  id?: string;
  className?: string;
  label?: string;
  labelledby?: string;
  controls: string;
}

const Toolbar = (props: IToolbar) => {
  const { children, id, label, labelledby, controls } = props;

  return (
    <div
      role="toolbar"
      id={id}
      aria-label={label}
      aria-labelledby={labelledby}
      aria-controls={controls}
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
  tabIndex?: 0 | -1;
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

const ToolbarButton = (props: IToolbarButton) => {
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
    tabIndex,
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
      className="toolbar-button"
      onClick={disabled ? undefined : onClick}
      role={role}
      aria-pressed={pressed}
      aria-checked={checked}
      aria-disabled={disabled}
      aria-controls={controls}
      aria-haspopup={haspopup}
      aria-expanded={expanded}
      tabIndex={tabIndex ?? -1}
    >
      {tooltip ? <Tooltip content={tooltip} hoverDelay={1500} trigger={content} /> : content}
    </button>
  );
};

interface IToolbarToggleButton extends IBaseButton {
  controls?: string;
  pressed: boolean;
}

const ToolbarToggleButton = (props: IToolbarToggleButton) => {
  const { id, pressed, onClick, icon, text, tooltip, showLabel, controls, tabIndex } = props;
  return (
    <ToolbarButton
      id={id}
      pressed={pressed}
      onClick={onClick}
      icon={icon}
      text={text}
      showLabel={showLabel}
      tooltip={tooltip}
      controls={controls}
      tabIndex={tabIndex}
    />
  );
};

interface IToolbarSegment {
  id?: string;
  showLabel?: 'always' | 'never';
  children: React.ReactNode;
  label: string;
}

const ToolbarSegment = ({ id, label, children, showLabel }: IToolbarSegment) => {
  return (
    <div id={id} role="radiogroup" aria-label={label} className={showLabel}>
      {children}
    </div>
  );
};

interface IToolbarSegmentButton extends IBaseButton {
  checked: boolean;
}

const ToolbarSegmentButton = (props: IToolbarSegmentButton) => {
  const { id, checked, onClick, icon, text, tooltip, showLabel, tabIndex } = props;
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
      tabIndex={tabIndex}
    />
  );
};

import { Menu, MenuChildren } from '../menus';

interface IMenuButton {
  id: string;
  text: React.ReactText;
  icon: JSX.Element;
  showLabel?: 'always' | 'never';
  tooltip?: string;
  controls: string;
  children: MenuChildren;
  disabled?: boolean;
}

const MenuButton = (props: IMenuButton) => {
  const [isOpen, setIsOpen] = useState(false);
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (container.current && isOpen) {
      // Focus first focusable menu item
      const first = container.current.querySelector('[role^="menuitem"]') as HTMLElement | null;
      // The Menu component will handle setting the tab indices.
      if (first !== null) {
        first.focus();
      }
    }
  }, [isOpen]);

  const handleBlur = (e: React.FocusEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      e.stopPropagation();
      setIsOpen(false);
      (e.currentTarget.previousElementSibling as HTMLElement).focus();
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    const target = (e.target as HTMLElement).closest('[role^="menuitem"]') as HTMLElement | null;
    if (target !== null) {
      e.stopPropagation();
      setIsOpen(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      setIsOpen(false);
      (e.currentTarget.previousElementSibling as HTMLElement).focus();
    }
  };

  return (
    <RawPopover
      popoverRef={container}
      isOpen={isOpen}
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
      placement="bottom"
      onBlur={handleBlur}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
    >
      <Menu id={props.controls} labelledby={props.id}>
        {props.children}
      </Menu>
    </RawPopover>
  );
};

export {
  Toolbar,
  ToolbarButton,
  MenuButton,
  ToolbarSegment,
  ToolbarSegmentButton,
  ToolbarToggleButton,
};
