import './button.scss';
import React from 'react';

interface IButton {
  text: React.ReactText;
  icon?: JSX.Element;
  onClick: (event: React.MouseEvent) => void;
  styling?: 'minimal' | 'outlined' | 'filled';
  disabled?: boolean;
}

const Button = ({ text, icon, onClick, styling = 'minimal', disabled }: IButton) => {
  return (
    <button className={`btn btn-${styling}`} onClick={onClick} disabled={disabled}>
      {icon && (
        <span className="btn-content-icon" aria-hidden="true">
          {icon}
        </span>
      )}
      <span className="btn-content-text">{text}</span>
    </button>
  );
};

interface IButtonGroup {
  id?: string;
  children: (React.ReactElement | undefined)[] | React.ReactElement;
}

const ButtonGroup = ({ id, children }: IButtonGroup) => {
  return (
    <div id={id} className="btn-group">
      {children}
    </div>
  );
};

interface IIconButton {
  text: string;
  icon: JSX.Element;
  onClick: (event: React.MouseEvent) => void;
  large?: boolean;
  disabled?: boolean;
}

const IconButton = ({ text, icon, onClick, disabled, large }: IIconButton) => {
  return (
    <button
      className={`btn btn-icon${large ? ' btn-icon-large' : ''}`}
      onClick={onClick}
      disabled={disabled}
      type="button"
    >
      <span className="btn-content-icon" aria-hidden="true">
        {icon}
      </span>
      <span className="btn-content-text hidden">{text}</span>
    </button>
  );
};

export { Button, ButtonGroup, IconButton };
