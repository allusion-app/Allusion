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
        <span className="btn-content-icon" aria-hidden="true">
          {icon}
        </span>
      )}
      <span className="btn-content-label">{label}</span>
    </button>
  );
});

interface IButtonGroup {
  id?: string;
  children: (React.ReactElement | undefined)[] | React.ReactElement;
}

const ButtonGroup = observer(({ id, children }: IButtonGroup) => {
  return (
    <div id={id} className="btn-group">
      {children}
    </div>
  );
});

interface IIconButton {
  label: string;
  icon: JSX.Element;
  onClick: (event: React.MouseEvent) => void;
  disabled?: boolean;
}

const IconButton = observer(({ label, icon, onClick, disabled }: IIconButton) => {
  return (
    <button className="btn btn-icon" onClick={onClick} disabled={disabled}>
      <span className="btn-content-icon" aria-hidden="true">
        {icon}
      </span>
      <span className="btn-content-label hidden">{label}</span>
    </button>
  );
});

export { Button, ButtonGroup, IconButton };
