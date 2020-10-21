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
  className?: string;
  children: (React.ReactElement | undefined)[] | React.ReactElement;
}

const ButtonGroup = ({ id, children, className = '' }: IButtonGroup) => {
  return (
    <div id={id} className={`btn-group ${className}`}>
      {children}
    </div>
  );
};

interface IIconButton {
  text: string;
  icon: JSX.Element;
  onClick: (event: React.MouseEvent) => void;
  disabled?: boolean;
}

const IconButton = ({ text, icon, onClick, disabled }: IIconButton) => {
  return (
    <button className="btn btn-icon" onClick={onClick} disabled={disabled}>
      <span className="btn-content-icon" aria-hidden="true">
        {icon}
      </span>
      <span className="btn-content-text hidden">{text}</span>
    </button>
  );
};

export { Button, ButtonGroup, IconButton };
