import React, { useEffect, useRef } from 'react';

import { Button } from 'widgets';
import { Intent } from 'widgets/Button';

export interface DialogProps {
  open: boolean;
  title: string;
  icon: JSX.Element;
  describedby?: string;
  children: React.ReactNode;
  /** If no event listener is provided for the close event, by default closing
   *  with the Escape key will be disabled. This is to ensure that no error is
   * thrown when HTMLDialogElement.showModal() is called.
   *
   * The cancel event is not provided because the close event is also called on cancel.
   */
  onClose?: () => void;
}

export const Dialog = (props: DialogProps) => {
  const { open, title, icon, describedby, onClose, children } = props;

  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const element = dialog.current;
    if (element === null) {
      return;
    }

    if (onClose !== undefined) {
      element.addEventListener('close', onClose);
    }
    const cancel = onClose ?? ((e: Event) => e.preventDefault());
    element.addEventListener('cancel', cancel);

    return () => {
      if (onClose !== undefined) {
        element.removeEventListener('close', onClose);
      }
      element.removeEventListener('cancel', cancel);
    };
  }, [onClose]);

  useEffect(() => {
    if (dialog.current) {
      open ? dialog.current.showModal() : dialog.current.close();
    }
  }, [open]);

  return (
    <dialog ref={dialog} aria-labelledby="dialog-title" aria-describedby={describedby}>
      <div className="dialog-header">
        <span aria-hidden="true">{icon}</span>
        <span id="dialog-title" className="dialog-title">
          {title}
        </span>
        {onClose !== undefined ? (
          <button aria-keyshortcuts="Esc" className="btn dialog-close" onClick={onClose}>
            <span className="visually-hidden">Close</span>
          </button>
        ) : undefined}
      </div>
      {children}
    </dialog>
  );
};

export interface AlertProps extends AlertActionsProps {
  open: boolean;
  title: React.ReactChild;
  icon?: JSX.Element;
  children: React.ReactNode;
}

export const Alert = (props: AlertProps) => {
  const { open, onClick, title, children, icon } = props;
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
    >
      <div className="alert-content">
        <span className="alert-icon">{icon}</span>
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
          primaryButtonIntent={props.primaryButtonIntent}
          secondaryButtonIntent={props.secondaryButtonIntent}
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
  primaryButtonIntent?: Intent;
  secondaryButtonIntent?: Intent;
}

const AlertActions = (props: AlertActionsProps) => {
  const {
    onClick,
    closeButtonText = 'Cancel',
    primaryButtonText,
    secondaryButtonText,
    defaultButton,
    primaryButtonIntent,
    secondaryButtonIntent,
  } = props;

  const buttons = [];
  if (primaryButtonText !== undefined) {
    buttons.push(
      <Button
        key="primary"
        styling={defaultButton === DialogButton.PrimaryButton ? 'filled' : 'outlined'}
        text={primaryButtonText}
        intent={primaryButtonIntent}
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
        intent={secondaryButtonIntent}
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
