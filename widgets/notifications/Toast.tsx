import './notifications.scss';

import React from 'react';
import { Button } from 'widgets/Button';

interface IToast {
  message: string;
  // "action" apparently is a reserverd keyword, it gets removed by mobx...
  clickAction?: React.ReactNode;
  timeout: number;
  onDismiss: () => void;
}

export const Toast = ({ message, clickAction, onDismiss }: IToast) => {
  return (
    <div className="toast">
      <span>{message}</span>
      {clickAction}
      <Button text="Dismiss" onClick={onDismiss} />
    </div>
  );
};
