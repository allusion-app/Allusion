import React, { useEffect, useRef } from 'react';
import { IconSet } from 'widgets/Icons';

export interface DialogProps {
  open: boolean;
  title: string;
  icon: JSX.Element;
  describedby?: string;
  children: React.ReactNode;
  /** Provide callback when submitting a form with method dialog, pressing Esc
   * or the close button.
   */
  onClose: () => void;
}

export const Dialog = (props: DialogProps) => {
  const { open, title, icon, describedby, onClose, children } = props;

  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const element = dialog.current;
    if (element === null) {
      return;
    }

    element.addEventListener('close', onClose);
    element.addEventListener('cancel', onClose);

    return () => {
      element.removeEventListener('close', onClose);
      element.removeEventListener('cancel', onClose);
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
        <span aria-hidden="true" className="dialog-icon">
          {icon}
        </span>
        <span id="dialog-title" className="dialog-title">
          {title}
        </span>
        <button aria-keyshortcuts="Esc" className="btn btn-icon dialog-close" onClick={onClose}>
          <span aria-hidden="true">{IconSet.CLOSE}</span>
          <span className="visually-hidden">Close</span>
        </button>
      </div>
      {children}
    </dialog>
  );
};
