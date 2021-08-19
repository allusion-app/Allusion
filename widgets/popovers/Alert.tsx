import React, { useEffect, useRef } from 'react';
import { Button } from 'widgets';
import { Intent } from 'widgets/utility';

import 'widgets/utility/utility.scss';

export interface AlertProps extends AlertActionsProps {
  open: boolean;
  title: React.ReactChild;
  icon?: JSX.Element;
  type?: Intent;
  children: React.ReactNode;
}

export const Alert = (props: AlertProps) => {
  const { open, onClick, title, children, icon, type } = props;
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const element = dialog.current;
    if (element === null) {
      return;
    }

    const cancel = (e: Event) => e.preventDefault();
    element.addEventListener('cancel', cancel);

    return () => {
      element.removeEventListener('cancel', cancel);
    };
  }, []);

  useEffect(() => {
    if (dialog.current) {
      open ? dialog.current.showModal() : dialog.current.close();
    }
  }, [open]);

  return (
    <dialog
      ref={dialog}
      role="alertdialog"
      aria-labelledby="alert-title"
      aria-describedby="alert-message"
      data-message-intent={type}
    >
      <div className="alert-content">
        <span className="dialog-icon">{icon}</span>
        <span id="alert-title" className="dialog-title">
          {title}
        </span>
        <div id="alert-message" className="alert-message">
          {children}
        </div>
        <AlertActions
          closeButtonText={props.closeButtonText}
          secondaryButtonText={props.secondaryButtonText}
          primaryButtonText={props.primaryButtonText}
          defaultButton={props.defaultButton}
          onClick={onClick}
        />
      </div>
    </dialog>
  );
};

export enum DialogButton {
  CloseButton,
  PrimaryButton,
  SecondaryButton,
}

export interface AlertActionsProps {
  onClick: (button: DialogButton) => void;
  /**
   * @default Cancel
   */
  closeButtonText?: string;
  primaryButtonText?: string;
  secondaryButtonText?: string;
  defaultButton?: DialogButton;
}

const AlertActions = (props: AlertActionsProps) => {
  const {
    onClick,
    closeButtonText = 'Cancel',
    primaryButtonText,
    secondaryButtonText,
    defaultButton,
  } = props;

  const buttons = [];
  if (primaryButtonText !== undefined) {
    buttons.push(
      <Button
        key="primary"
        styling={defaultButton === DialogButton.PrimaryButton ? 'filled' : 'outlined'}
        text={primaryButtonText}
        onClick={() => onClick(DialogButton.PrimaryButton)}
      />,
    );
  }
  if (secondaryButtonText !== undefined) {
    buttons.push(
      <Button
        key="secondary"
        styling={defaultButton === DialogButton.SecondaryButton ? 'filled' : 'outlined'}
        text={secondaryButtonText}
        onClick={() => onClick(DialogButton.SecondaryButton)}
      />,
    );
  }
  buttons.push(
    <Button
      key="close"
      styling={defaultButton === DialogButton.CloseButton ? 'filled' : 'outlined'}
      text={closeButtonText ?? 'Cancel'}
      onClick={() => onClick(DialogButton.CloseButton)}
    />,
  );

  return <div className="dialog-actions">{buttons}</div>;
};
