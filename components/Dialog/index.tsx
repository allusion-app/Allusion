import './dialog.scss';
import React, { useEffect, useRef } from 'react';
import { Button, ButtonGroup } from 'components';
import { observer } from 'mobx-react-lite';

interface IAlert extends IDialogActions {
  isOpen: boolean;
  title: React.ReactChild;
  icon?: JSX.Element;
  information: string;
  view?: JSX.Element;
  className?: string;
  // onSuppression?: () => void;
}

const Alert = observer((props: IAlert) => {
  const { isOpen, onClick, title, information, view, icon } = props;
  const alert = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const element = alert.current;
    const handleClose = () => onClick(DialogButton.CloseButton);
    element?.addEventListener('close', handleClose);

    return () => element?.removeEventListener('close', handleClose);
  }, [onClick]);

  useEffect(() => {
    if (alert.current) {
      isOpen ? alert.current.showModal() : alert.current.close();
    }
  }, [isOpen]);

  return (
    <dialog
      ref={alert}
      role="alertdialog"
      aria-labelledby="dialog-label"
      aria-describedby="dialog-information"
      className={props.className}
    >
      <div className="dialog-content">
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
      </div>
    </dialog>
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

export { Alert, DialogButton, DialogActions };
