import './toolbar.scss';
import React from 'react';
import { Tooltip } from '@blueprintjs/core';

interface IToolbar {
  children: React.ReactNode;
  id?: string;
  className?: string;
  label: string;
  controls: string;
}

const Toolbar = (props: IToolbar) => {
  const { children, id, className, label, controls } = props;
  return (
    <div
      role="toolbar"
      id={id}
      className={`toolbar ${className}`}
      aria-label={label}
      aria-controls={controls}
    >
      {children}
    </div>
  );
};

export default Toolbar;

interface IToolbarButton {
  label: string;
  icon: JSX.Element;
  onClick?: () => void;
  role?: string;
  disabled?: boolean;
  pressed?: boolean;
  checked?: boolean;
  tooltip?: string;
}

export const ToolbarButton = (props: IToolbarButton) => {
  const { onClick, icon, label, role, pressed, checked, disabled, tooltip } = props;
  const content = (
    <span className="toolbar-button-content">
      <span className="toolbar-button-icon" aria-hidden="true">
        {icon}
      </span>
      <span className="toolbar-button-label">{label}</span>
    </span>
  );
  return (
    <button
      className="toolbar-button"
      onClick={onClick}
      role={role}
      aria-pressed={pressed}
      aria-checked={checked}
      aria-disabled={disabled}
      tabIndex={-1}
    >
      {tooltip ? <Tooltip content={tooltip}>{content}</Tooltip> : content}
    </button>
  );
};

interface IToolbarGroup {
  children: React.ReactNode;
  id?: string;
  label?: string;
  role?: string;
}

export const ToolbarGroup = (props: IToolbarGroup) => {
  const { id, label, children, role } = props;
  return (
    <div id={id} className="toolbar-group" role={role} aria-label={label}>
      {children}
    </div>
  );
};

interface IToolbarToggleButton {
  label: string;
  icon: JSX.Element;
  onClick: () => void;
  pressed: boolean;
  tooltip?: string;
}

export const ToolbarToggleButton = (props: IToolbarToggleButton) => {
  const { pressed, onClick, icon, label, tooltip } = props;
  return (
    <ToolbarButton
      pressed={pressed}
      onClick={onClick}
      icon={icon}
      label={label}
      tooltip={tooltip}
    />
  );
};

interface IToolbarSegment {
  children: React.ReactNode;
  label: string;
}

export const ToolbarSegment = ({ label, children }: IToolbarSegment) => {
  return (
    <div className="toolbar-group" role="radiogroup" aria-label={label}>
      {children}
    </div>
  );
};

interface IToolbarSegmentButton extends IToolbarButton {
  label: string;
  icon: JSX.Element;
  onClick: () => void;
  checked: boolean;
  tooltip?: string;
}

export const ToolbarSegmentButton = (props: IToolbarSegmentButton) => {
  const { checked, onClick, icon, label, tooltip } = props;
  return (
    <ToolbarButton
      role="radio"
      checked={checked}
      onClick={onClick}
      icon={icon}
      label={label}
      tooltip={tooltip}
    />
  );
};
