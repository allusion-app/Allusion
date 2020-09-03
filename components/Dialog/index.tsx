import './dialog.scss';
import React, { useEffect, useRef } from 'react';
import { Button, ButtonGroup } from 'components';
import { observer } from 'mobx-react-lite';

interface IDialog {
  open: boolean;
  role?: string;
  labelledby?: string;
  describedby?: string;
  children: React.ReactNode;
  className?: string;
  onClose: (event: Event) => void;
}

const Dialog = observer((props: IDialog) => {
  const { open, children, onClose } = props;
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const element = dialog.current;
    element?.addEventListener('close', onClose);

    return () => element?.removeEventListener('close', onClose);
  }, [onClose]);

  useEffect(() => {
    if (dialog.current) {
      open ? dialog.current.showModal() : dialog.current.close();
    }
  }, [open]);

  return (
    <dialog
      ref={dialog}
      role={props.role}
      aria-labelledby={props.labelledby}
      aria-describedby={props.describedby}
      className={props.className}
    >
      <div className="dialog-content">{children}</div>
    </dialog>
  );
});

interface IAlert extends IDialogActions {
  open: boolean;
  title: React.ReactChild;
  icon?: JSX.Element;
  information: string;
  view?: React.ReactNode;
  className?: string;
  // onSuppression?: () => void;
}

const Alert = observer((props: IAlert) => {
  const { open, onClick, title, information, view, icon } = props;

  return (
    <Dialog
      open={open}
      role="alertdialog"
      labelledby="dialog-label"
      describedby="dialog-information"
      className={props.className}
      onClose={() => onClick(DialogButton.CloseButton)}
    >
      <span className="dialog-icon">{icon}</span>
      <h2 id="dialog-label" className="dialog-label">
        {title}
      </h2>
      <div id="dialog-information" className="dialog-information">
        <p>{information}</p>
        {view}
      </div>
      <DialogActions
        closeButtonText={props.closeButtonText}
        secondaryButtonText={props.secondaryButtonText}
        primaryButtonText={props.primaryButtonText}
        defaultButton={props.defaultButton}
        onClick={onClick}
      />
    </Dialog>
  );
});

enum DialogButton {
  CloseButton,
  PrimaryButton,
  SecondaryButton,
}

interface IDialogActions {
  onClick: (button: DialogButton) => void;
  closeButtonText: string;
  primaryButtonText?: string;
  secondaryButtonText?: string;
  defaultButton?: DialogButton;
}

const DialogActions = observer((props: IDialogActions) => {
  return (
    <ButtonGroup className="dialog-actions">
      {props.primaryButtonText ? (
        <Button
          styling={props.defaultButton === DialogButton.PrimaryButton ? 'filled' : 'outlined'}
          label={props.primaryButtonText}
          onClick={() => props.onClick(DialogButton.PrimaryButton)}
        />
      ) : undefined}
      {props.secondaryButtonText ? (
        <Button
          styling={props.defaultButton === DialogButton.SecondaryButton ? 'filled' : 'outlined'}
          label={props.secondaryButtonText}
          onClick={() => props.onClick(DialogButton.SecondaryButton)}
        />
      ) : undefined}
      <Button
        styling={props.defaultButton === DialogButton.CloseButton ? 'filled' : 'outlined'}
        label={props.closeButtonText}
        onClick={() => props.onClick(DialogButton.CloseButton)}
      />
    </ButtonGroup>
  );
});

export { Alert, Dialog, DialogButton, DialogActions };
