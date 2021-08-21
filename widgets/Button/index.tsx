import './button.scss';
import 'widgets/utility/utility.scss';
import React from 'react';

interface ButtonProps {
  text: React.ReactText;
  icon?: JSX.Element;
  onClick: (event: React.MouseEvent) => void;
  styling?: 'minimal' | 'outlined' | 'filled';
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
}

const Button = ({
  text,
  icon,
  onClick,
  styling = 'minimal',
  disabled,
  type = 'button',
}: ButtonProps) => {
  return (
    <button className={`btn-${styling}`} onClick={onClick} disabled={disabled} type={type}>
      {icon && (
        <span className="btn-content-icon" aria-hidden="true">
          {icon}
        </span>
      )}
      <span className="btn-content-text">{text}</span>
    </button>
  );
};

interface ButtonGroupProps {
  id?: string;
  children: (React.ReactElement | undefined)[] | React.ReactElement;
}

const ButtonGroup = ({ id, children }: ButtonGroupProps) => {
  return (
    <div id={id} className="btn-group">
      {children}
    </div>
  );
};

interface IconButtonProps {
  text: string;
  icon: JSX.Element;
  onClick: (event: React.MouseEvent) => void;
  className?: string;
  disabled?: boolean;
}

const IconButton = ({ text, icon, onClick, disabled, className }: IconButtonProps) => {
  return (
    <button
      className={`${className !== undefined ? className : ''} btn-icon`}
      onClick={onClick}
      disabled={disabled}
      type="button"
      data-tooltip={text}
    >
      <span className="btn-content-icon" aria-hidden="true">
        {icon}
      </span>
      <span className="visually-hidden">{text}</span>
    </button>
  );
};

export { Button, ButtonGroup, IconButton };
