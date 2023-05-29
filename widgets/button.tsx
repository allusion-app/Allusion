import React from 'react';
import 'widgets/utility/utility.scss';

type ButtonProps = {
  text: string | number;
  icon?: JSX.Element;
  onClick: (event: React.MouseEvent) => void;
  styling?: 'minimal' | 'outlined' | 'filled';
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
  tooltip?: string;
};

const Button = ({
  text,
  icon,
  onClick,
  styling = 'minimal',
  disabled,
  type = 'button',
  tooltip,
}: ButtonProps) => {
  return (
    <button
      className={`btn-${styling}`}
      onClick={onClick}
      disabled={disabled}
      type={type}
      data-tooltip={tooltip}
    >
      {icon}
      {text}
    </button>
  );
};

type ButtonGroupProps = {
  children: (React.ReactElement | undefined)[] | React.ReactElement;
  align?: 'left' | 'center';
};

const ButtonGroup = ({ children, align = 'left' }: ButtonGroupProps) => {
  return <div className={`btn-group align-${align}`}>{children}</div>;
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
      {icon}
      <span className="visually-hidden">{text}</span>
    </button>
  );
};

export { Button, ButtonGroup, IconButton };
