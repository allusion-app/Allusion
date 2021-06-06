import './button.scss';
import React from 'react';
import { useTooltip } from 'widgets/popovers';

interface IButton {
  text: React.ReactText;
  icon?: JSX.Element;
  onClick: (event: React.MouseEvent) => void;
  styling?: 'minimal' | 'outlined' | 'filled';
  disabled?: boolean;
  type?: 'button' | 'submit';
}

const Button = ({
  text,
  icon,
  onClick,
  styling = 'minimal',
  disabled,
  type = 'button',
}: IButton) => {
  return (
    <button className={`btn btn-${styling}`} onClick={onClick} disabled={disabled} type={type}>
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
  className?: string;
  disabled?: boolean;
}

const IconButton = ({ text, icon, onClick, disabled, className }: IIconButton) => {
  const { onHide, onShow } = useTooltip(text);

  return (
    <button
      className={`${className !== undefined ? className : ''} btn btn-icon`}
      onClick={onClick}
      disabled={disabled}
      type="button"
      onFocusCapture={onShow}
      onBlurCapture={onHide}
      onMouseOverCapture={onShow}
      onMouseOutCapture={onHide}
    >
      <span className="btn-content-icon" aria-hidden="true">
        {icon}
      </span>
      <span className="btn-content-text hidden">{text}</span>
    </button>
  );
};

export { Button, ButtonGroup, IconButton };
