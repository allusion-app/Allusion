import './button.scss';
import { observer } from 'mobx-react-lite';
import React from 'react';

interface IButton {
  label: string;
  icon?: JSX.Element;
  onClick: (event: React.MouseEvent) => void;
  styling?: 'minimal' | 'outlined' | 'filled';
  disabled?: boolean;
}

const Button = observer(({ label, icon, onClick, styling = 'minimal', disabled }: IButton) => {
  return (
    <button className={`btn btn-${styling}`} onClick={onClick} disabled={disabled}>
      {icon && (
        <span className="btn-icon" aria-hidden="true">
          {icon}
        </span>
      )}
      <span className="btn-label">{label}</span>
    </button>
  );
});

interface IButtonGroup {
  id?: string;
  children: React.ReactElement[];
}

const ButtonGroup = observer(({ id, children }: IButtonGroup) => {
  return (
    <div id={id} className="btn-group">
      {children}
    </div>
  );
});

export { Button, ButtonGroup };
