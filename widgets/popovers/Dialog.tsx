import React, { useEffect, useRef } from 'react';
import { IconSet } from 'widgets/Icons';
import { generateWidgetId } from 'widgets/utility';

import 'widgets/utility/utility.scss';
import './popover.scss';

export interface DialogProps {
  open: boolean;
  title: string;
  icon: JSX.Element;
  describedby?: string;
  children: React.ReactNode;
  onCancel: () => void;
  onClose?: () => void;
}

export const Dialog = (props: DialogProps) => {
  const { open, title, icon, describedby, onClose, onCancel, children } = props;

  const dialog = useRef<HTMLDialogElement>(null);
  const dialogTitle = useRef(generateWidgetId('__dialog-title')).current;

  useEffect(() => {
    const element = dialog.current;
    if (element === null) {
      return;
    }

    if (onClose) {
      element.addEventListener('close', onClose);
    }
    element.addEventListener('cancel', onCancel);

    return () => {
      if (onClose) {
        element.removeEventListener('close', onClose);
      }
      element.removeEventListener('cancel', onCancel);
    };
  }, [onClose, onCancel]);

  useEffect(() => {
    if (dialog.current) {
      const elemHack = dialog.current as any; // fixme: Updated TS doesn't support HTMLDialogElement anymore?
      open ? elemHack.showModal?.() : elemHack.close?.();
    }
  }, [open]);

  return (
    <dialog ref={dialog} aria-labelledby={dialogTitle} aria-describedby={describedby}>
      <div className="dialog-header">
        <span aria-hidden="true" className="dialog-icon">
          {icon}
        </span>
        <span id={dialogTitle} className="dialog-title">
          {title}
        </span>
        <button aria-keyshortcuts="Esc" className="btn-icon dialog-close" onClick={onCancel}>
          <span aria-hidden="true">{IconSet.CLOSE}</span>
          <span className="visually-hidden">Close</span>
        </button>
      </div>
      {children}
    </dialog>
  );
};
