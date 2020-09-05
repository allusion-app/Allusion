import './dialog.scss';
import React, { useEffect, useRef } from 'react';
import { Button, ButtonGroup } from 'components';
import { observer } from 'mobx-react-lite';

interface IDialog extends React.HTMLAttributes<HTMLDivElement> {
  open: boolean;
  role?: string;
  label?: string;
  labelledby?: string;
  describedby?: string;
  children: React.ReactNode;
  className?: string;
  onClose?: (event: Event) => void;
  /** If no event listener is provided for the cancel event, by default closing
   *  with the Escape key will be disabled. This is to ensure that no error is
   * thrown when HTMLDialogElement.showModal() is called.  */
  onCancel?: (event: Event) => void;
}

const preventClosingOnEscape = (e: Event) => e.preventDefault();

const Dialog = observer((props: IDialog) => {
  const {
    open,
    role,
    label,
    labelledby,
    describedby,
    className,
    onClose,
    onCancel = preventClosingOnEscape,
    children,
    ...p
  } = props;

  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const element = dialog.current;
    if (onClose) {
      element?.addEventListener('close', onClose);
    }
    element?.addEventListener('cancel', onCancel);

    return () => {
      if (onClose) {
        element?.removeEventListener('close', onClose);
      }
      element?.removeEventListener('close', onCancel);
    };
  }, [onClose, onCancel]);

  useEffect(() => {
    if (dialog.current) {
      open ? dialog.current.showModal() : dialog.current.close();
    }
  }, [open]);

  return (
    <dialog
      ref={dialog}
      role={role}
      aria-label={label}
      aria-labelledby={labelledby}
      aria-describedby={describedby}
      className={className}
    >
      <div {...p} className="dialog-content">
        {children}
      </div>
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
      labelledby="dialog-heading"
      describedby="dialog-information"
      className={props.className}
    >
      <span className="dialog-icon">{icon}</span>
      <h2 id="dialog-heading" className="dialog-heading">
        {title}
      </h2>
      <div id="dialog-information" className="dialog-information">
        <p>{information}</p>
        {view}
      </div>
      <div className="dialog-footer">
        <DialogActions
          closeButtonText={props.closeButtonText}
          secondaryButtonText={props.secondaryButtonText}
          primaryButtonText={props.primaryButtonText}
          defaultButton={props.defaultButton}
          onClick={onClick}
        />
      </div>
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
          text={props.primaryButtonText}
          onClick={() => props.onClick(DialogButton.PrimaryButton)}
        />
      ) : undefined}
      {props.secondaryButtonText ? (
        <Button
          styling={props.defaultButton === DialogButton.SecondaryButton ? 'filled' : 'outlined'}
          text={props.secondaryButtonText}
          onClick={() => props.onClick(DialogButton.SecondaryButton)}
        />
      ) : undefined}
      <Button
        styling={props.defaultButton === DialogButton.CloseButton ? 'filled' : 'outlined'}
        text={props.closeButtonText}
        onClick={() => props.onClick(DialogButton.CloseButton)}
      />
    </ButtonGroup>
  );
});

interface IPopover {
  open: boolean;
  label?: string;
  labelledby?: string;
  describedby?: string;
  /** The popover trigger and content is passed as a tuple: `[trigger, content]`. */
  children: [React.ReactElement<HTMLElement>, React.ReactElement<HTMLElement>];
  className?: string;
  onClose?: (event: Event) => void;
  onCancel?: (event: Event) => void;
}

const Popover = observer((props: IPopover) => {
  const { open, label, labelledby, describedby, className, onClose, onCancel, children } = props;
  const [trigger, content] = children;

  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const element = dialog.current;
    if (onClose) {
      element?.addEventListener('close', onClose);
    }
    if (onCancel) {
      element?.addEventListener('cancel', onCancel);
    }

    return () => {
      if (onClose) {
        element?.removeEventListener('close', onClose);
      }
      if (onCancel) {
        element?.removeEventListener('close', onCancel);
      }
    };
  }, [onClose, onCancel]);

  return (
    <>
      {trigger}
      <dialog
        open={open}
        // data-popover
        ref={dialog}
        aria-label={label}
        aria-labelledby={labelledby}
        aria-describedby={describedby}
        className={className}
      >
        {content}
      </dialog>
    </>
  );
});

export { Alert, Dialog, DialogButton, DialogActions, Popover };
