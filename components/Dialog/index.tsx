import './dialog.scss';
import React from 'react';
import { Overlay } from '@blueprintjs/core';
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
  return (
    <Overlay
      isOpen={props.isOpen}
      hasBackdrop={false}
      onClose={() => props.onClick(DialogButton.CloseButton)}
    >
      <div className="dialog-container">
        <div
          role="alertdialog"
          aria-modal="true"
          aria-label="dialog-label"
          aria-describedby="dialog-information"
          className={props.className}
        >
          <span className="dialog-icon">{props.icon}</span>
          <h2 id="dialog-label" className="dialog-label">
            {props.title}
          </h2>
          <div id="dialog-information" className="dialog-information">
            <p>{props.information}</p>
            {props.view}
          </div>
          <DialogActions
            closeButtonText={props.closeButtonText}
            secondaryButtonText={props.secondaryButtonText}
            primaryButtonText={props.primaryButtonText}
            defaultButton={props.defaultButton}
            onClick={props.onClick}
          />
        </div>
      </div>
    </Overlay>
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
