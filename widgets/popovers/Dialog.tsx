import React, { useEffect, useRef } from 'react';

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
