import './button.scss';
import React, { useRef } from 'react';
import { Tooltip } from 'widgets/popovers';

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
  large?: boolean;
  disabled?: boolean;
}

const IconButton = ({ text, icon, onClick, disabled, large }: IIconButton) => {
  const portalTriggerRef = useRef<HTMLButtonElement>(null);

  const iconButton = (
    <button
      className={`btn btn-icon${large ? ' btn-icon-large' : ''}`}
      onClick={onClick}
      disabled={disabled}
      type="button"
      ref={portalTriggerRef}
    >
      <span className="btn-content-icon" aria-hidden="true">
        {icon}
      </span>
      <span className="btn-content-text hidden">{text}</span>
    </button>
  );

  if (text) {
    return <Tooltip content={text} trigger={iconButton} portalTriggerRef={portalTriggerRef} />;
  } else {
    return iconButton;
  }
};

export { Button, ButtonGroup, IconButton };
