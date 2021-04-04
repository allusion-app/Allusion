import './notifications.scss';

import React from 'react';
import { Button } from 'widgets/Button';

interface IToast {
  message: string;
  // "action" apparently is a reserverd keyword, it gets removed by mobx...
  clickAction?: {
    label: string;
    onClick: () => void;
  };
  timeout: number;
  onDismiss: () => void;
}

export const Toast = ({ message, clickAction, onDismiss }: IToast) => {
  return (
    <div className="toast">
      <span>{message}</span>
      {clickAction && <Button text={clickAction.label} onClick={clickAction.onClick} />}
      <Button text="Dismiss" onClick={onDismiss} />
    </div>
  );
};
