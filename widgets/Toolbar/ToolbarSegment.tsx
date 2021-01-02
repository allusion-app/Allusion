import React from 'react';

import { ToolbarButton } from './index';

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

interface IToolbarSegmentButton {
  id?: string;
  text: React.ReactText;
  icon: JSX.Element;
  onClick?: (event: React.MouseEvent) => void;
  showLabel?: 'always' | 'never';
  tooltip?: string;
  checked: boolean;
}

export const ToolbarSegmentButton = (props: IToolbarSegmentButton) => {
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
