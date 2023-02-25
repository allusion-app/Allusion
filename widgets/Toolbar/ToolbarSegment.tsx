import React from 'react';

export interface IToolbarSegment {
  id?: string;
  children: React.ReactElement<IToolbarSegment>;
  label: string;
}

export const ToolbarSegment = ({ id, label, children }: IToolbarSegment) => {
  return (
    <div id={id} role="radiogroup" aria-label={label}>
      {children}
    </div>
  );
};

interface ToolbarSegmentButtonProps {
  id?: string;
  text: React.ReactText;
  icon: JSX.Element;
  onClick?: (event: React.MouseEvent) => void;
  isCollapsible?: boolean;
  tooltip?: string;
  checked: boolean;
}

export const ToolbarSegmentButton = (props: ToolbarSegmentButtonProps) => {
  const { id, checked, onClick, icon, text, tooltip, isCollapsible } = props;
  return (
    <button
      id={id}
      role="radio"
      className="toolbar-button"
      aria-checked={checked}
      onClick={onClick}
      data-tooltip={tooltip ?? text}
      data-collapsible={isCollapsible}
    >
      {icon}
      <span className="btn-content-text">{text}</span>
    </button>
  );
};
