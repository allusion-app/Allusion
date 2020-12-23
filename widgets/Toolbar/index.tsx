import './toolbar.scss';
import React, { useEffect, useRef, useState } from 'react';
import { Tooltip, Flyout } from '../popovers';
import { IMenu } from '../menus';

interface IToolbar {
  children: React.ReactNode;
  id?: string;
  className?: string;
  label?: string;
  labelledby?: string;
  controls: string;
}

const Toolbar = (props: IToolbar) => {
  const { children, id, className, label, labelledby, controls } = props;

  return (
    <div
      role="toolbar"
      id={id}
      className={className}
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
      className="toolbar-item toolbar-button"
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

interface IBaseGroup {
  children: React.ReactNode;
  showLabel?: 'always' | 'never';
}

interface IToolbarGroup extends IBaseGroup {
  id?: string;
  label?: string;
  role?: string;
}

const ToolbarGroup = (props: IToolbarGroup) => {
  const { id, label, children, role, showLabel } = props;
  return (
    <div id={id} className={`toolbar-group ${showLabel ?? ''}`} role={role} aria-label={label}>
      {children}
    </div>
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

interface IToolbarSegment extends IBaseGroup {
  label: string;
}

const ToolbarSegment = ({ label, children, showLabel }: IToolbarSegment) => {
  return (
    <ToolbarGroup role="radiogroup" label={label} showLabel={showLabel}>
      {children}
    </ToolbarGroup>
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

interface IToolbarMenuButton extends IBaseButton {
  controls: string;
  /** The element must be a Menu component otherwise focus will not work. */
  children: React.ReactElement<IMenu>;
  disabled?: boolean;
  /** @default 'menu' */
  role?: 'menu' | 'group';
}

const ToolbarMenuButton = (props: IToolbarMenuButton) => {
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

  const handleClick = (e: React.MouseEvent) => {
    const target = (e.target as HTMLElement).closest('[role^="menuitem"]') as HTMLElement | null;
    if (target !== null) {
      e.stopPropagation();
      setIsOpen(false);
      (e.currentTarget.firstElementChild as HTMLElement).focus();
    }
  };

  return (
    <div ref={container} onClick={handleClick}>
      <Flyout
        isOpen={isOpen}
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
            tabIndex={props.tabIndex}
            haspopup="menu"
          />
        }
      >
        {props.children}
      </Flyout>
    </div>
  );
};

export {
  Toolbar,
  ToolbarGroup,
  ToolbarButton,
  ToolbarMenuButton,
  ToolbarSegment,
  ToolbarSegmentButton,
  ToolbarToggleButton,
};
