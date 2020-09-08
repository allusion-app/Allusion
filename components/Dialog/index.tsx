import './dialog.scss';
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Button, ButtonGroup } from 'components';
import { observer } from 'mobx-react-lite';
import { usePopper } from 'react-popper';
import { Placement } from '@popperjs/core/lib/enums';

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
      labelledby="dialog-title"
      describedby="dialog-information"
      className={props.className}
    >
      <span className="dialog-icon">{icon}</span>
      <h2 id="dialog-title" className="dialog-title">
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

const popperOptions = {
  modifiers: [
    {
      name: 'preventOverflow',
      options: {
        // Prevents dialogs from moving elements to the side
        boundary: document.body,
        padding: 8,
      },
    },
  ],
};

interface IFlyout {
  open: boolean;
  label?: string;
  labelledby?: string;
  describedby?: string;
  target: React.ReactElement<HTMLElement>;
  /** The popover content. */
  children: React.ReactNode;
  className?: string;
  onClose?: (event: Event) => void;
  /** If no event listener is provided for the cancel event, by default closing
   *  with the Escape key will be disabled. This is to ensure that the passed
   * state valid.  */
  onCancel?: (event: Event) => void;
  placement?: Placement;
}

const Flyout = observer((props: IFlyout) => {
  const {
    open,
    label,
    labelledby,
    describedby,
    className,
    onClose,
    onCancel = preventClosingOnEscape,
    target,
    children,
    placement,
  } = props;

  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLElement>();
  const options = useRef({ ...popperOptions, placement });

  // On mount find target element
  useEffect(() => {
    if (dialog.current && dialog.current.previousElementSibling) {
      trigger.current = dialog.current.previousElementSibling as HTMLElement;
    }
  }, []);

  // Focus first focusable element
  useEffect(() => {
    if (dialog.current && open) {
      const first =
        dialog.current.querySelector('[tabindex="0"]') ??
        dialog.current.querySelector('[tabindex="-1"]');
      if (first) {
        (first as HTMLElement).tabIndex = 0;
        (first as HTMLElement).focus();
      }
    }
  }, [open]);

  // Add event listeners because React does not have proper typings :)
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
        element?.removeEventListener('cancel', onCancel);
      }
    };
  }, [onClose, onCancel]);

  const { styles, attributes } = usePopper(trigger.current, dialog.current, options.current);

  return (
    <>
      {target}
      <dialog
        style={styles.popper}
        {...attributes.popper}
        open={open}
        data-flyout
        ref={dialog}
        aria-label={label}
        aria-labelledby={labelledby}
        aria-describedby={describedby}
        className={className}
      >
        {children}
      </dialog>
    </>
  );
});

interface ITooltip {
  content: React.ReactNode;
  children: React.ReactElement<HTMLElement>;
  /** @default 100 */
  hoverDelay?: number;
  /** @default 'auto' */
  placement?: Placement;
}

const Tooltip = observer((props: ITooltip) => {
  const { content, children, hoverDelay = 100, placement = 'auto' } = props;
  const [isOpen, setIsOpen] = useState(false);
  const timerID = useRef<number>();
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLElement>();
  const options = useRef({ ...popperOptions, placement });

  const handleMouseEnter = useCallback(() => {
    timerID.current = (setTimeout(() => setIsOpen(true), hoverDelay) as unknown) as number;
  }, [hoverDelay]);

  const handleMouseLeave = useCallback(() => {
    if (timerID.current) {
      clearTimeout(timerID.current);
      timerID.current = undefined;
    }
    setIsOpen(false);
  }, []);

  useEffect(() => {
    if (dialog.current && dialog.current.previousElementSibling) {
      trigger.current = dialog.current.previousElementSibling as HTMLElement;
      trigger.current.addEventListener('mouseenter', handleMouseEnter);
      trigger.current.addEventListener('mouseleave', handleMouseLeave);
    }

    // Clear timer on removing component
    return () => {
      if (timerID.current) {
        clearTimeout(timerID.current);
        timerID.current = undefined;
      }
      trigger.current?.removeEventListener('mouseenter', handleMouseEnter);
      trigger.current?.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [handleMouseEnter, handleMouseLeave]);

  const { styles, attributes } = usePopper(trigger.current, dialog.current, options.current);

  return (
    <>
      {children}
      <dialog style={styles.popper} {...attributes.popper} open={isOpen} data-tooltip ref={dialog}>
        <span role="tooltip" className="tooltip">
          {content}
        </span>
      </dialog>
    </>
  );
});

export { Alert, Dialog, DialogButton, DialogActions, Flyout, Tooltip };
