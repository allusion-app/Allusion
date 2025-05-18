import React from 'react';
import { Button } from 'widgets/button';

interface IToast {
  message: string;
  // "action" apparently is a reserverd keyword, it gets removed by mobx...
  clickAction?: React.ReactNode;
  timeout: number;
  onDismiss: () => void;
  type?: 'info' | 'success' | 'warning' | 'error';
}

export const Toast = ({ message, clickAction, onDismiss, type = "info" }: IToast) => {
  return (
    <div className={`toast toast-${type}`}>
      <span>{message}</span>
      {clickAction}
      <Button text="Dismiss" onClick={onDismiss} />
    </div>
  );
};
