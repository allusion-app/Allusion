import './toolbar.scss';
import React from 'react';
import { Tooltip } from '@blueprintjs/core';
import { observer } from 'mobx-react-lite';

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

interface IBaseButton {
  label: string;
  icon: JSX.Element;
  onClick?: () => void;
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
        className="toolbar-button"
        onClick={onClick}
        role={role}
        aria-pressed={pressed}
        aria-checked={checked}
        aria-disabled={disabled}
        tabIndex={-1}
      >
        {tooltip ? (
          <Tooltip content={tooltip} usePortal={false} hoverOpenDelay={500}>
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
}

export const ToolbarGroup = observer((props: IToolbarGroup) => {
  const { id, label, children, role, showLabel } = props;
  return (
    <div id={id} className={`toolbar-group ${showLabel ?? ''}`} role={role} aria-label={label}>
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

export const ToolbarSegment = ({ label, children, showLabel }: IToolbarSegment) => {
  return (
    <ToolbarGroup role="radiogroup" label={label} showLabel={showLabel}>
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
