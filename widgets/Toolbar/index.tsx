import './toolbar.scss';
import React, { useEffect, useRef } from 'react';

import { Tooltip } from '../popovers';

interface IToolbar {
  children: React.ReactNode;
  id?: string;
  label?: string;
  labelledby?: string;
  controls: string;
}

const Toolbar = (props: IToolbar) => {
  const { children, id, label, labelledby, controls } = props;
  const toolbar = useRef<HTMLDivElement>(null);

  // Either the first item or last focused toolbar item needs to be part of the
  // tab order.
  // A data attribute is used to find items. A role would mess up other kinds
  // of toolbar items like (radio) buttons and a class seems to always create
  // more of a mess for JS and CSS.
  useEffect(() => {
    if (toolbar.current === null) {
      return;
    }

    const lastFocusedItem = toolbar.current.querySelector('[tabindex="0"]');
    if (lastFocusedItem === null) {
      const firstToolbarItem: HTMLElement | null = toolbar.current.querySelector('[tabindex="-1"]');
      if (firstToolbarItem !== null) {
        firstToolbarItem.tabIndex = 0;
      }
    }
  }, [children]);

  return (
    <div
      ref={toolbar}
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
      tabIndex={-1}
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
  const { id, pressed, onClick, icon, text, tooltip, showLabel, controls } = props;
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
    />
  );
};

import { MenuButton } from './MenuButton';
import { ToolbarSegment, ToolbarSegmentButton } from './ToolbarSegment';

export {
  Toolbar,
  ToolbarButton,
  MenuButton,
  ToolbarSegment,
  ToolbarSegmentButton,
  ToolbarToggleButton,
};
