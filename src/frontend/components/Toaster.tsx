import React from 'react';
import { action, makeObservable, observable } from 'mobx';
import { observer } from 'mobx-react-lite';

import { ID, generateId } from 'src/entities/ID';

import { Button } from 'widgets/Button';

class ToastManager {
  readonly toastList = observable(new Array<IdentifiableToast>());
  private timeouts = new Map<ID, number>();

  constructor() {
    makeObservable(this);
  }

  @action show(toast: IToastProps, id?: ID): ID {
    if (id !== undefined) {
      const existing = this.toastList.findIndex((t) => t.id === id);
      if (existing !== -1) {
        this.toastList[existing] = { ...toast, id };
        let timerId = this.timeouts.get(id);
        window.clearTimeout(timerId);
        if (toast.timeout > 0) {
          timerId = window.setTimeout(() => this.dismiss(id), toast.timeout);
          this.timeouts.set(id, timerId);
        }
        return id;
      }
    }

    const toastWithKey: IdentifiableToast = {
      ...toast,
      id: id ?? generateId(),
    };
    this.toastList.push(toastWithKey);
    if (toast.timeout > 0) {
      const timerId = window.setTimeout(() => this.dismiss(toastWithKey.id), toast.timeout);
      this.timeouts.set(toastWithKey.id, timerId);
    }
    return toastWithKey.id;
  }

  @action dismiss(id: string): boolean {
    const instance = this.toastList.find((t) => t.id === id);
    if (instance !== undefined) {
      return this.toastList.remove(instance);
    }
    return false;
  }
}

// Create a singleton toaster - we should only be needing one
export const AppToaster = new ToastManager();

interface IToastProps {
  message: string;
  // "action" apparently is a reserverd keyword, it gets removed by mobx...
  clickAction?: {
    label: string;
    onClick: () => void;
  };
  timeout: number;
}

type IdentifiableToast = IToastProps & { id: ID };

const Toast = ({ message, id, clickAction }: IdentifiableToast) => {
  return (
    <div className="toast">
      <span>{message}</span>
      {clickAction?.onClick && <Button text={clickAction.label} onClick={clickAction.onClick} />}
      <Button text="Dismiss" onClick={() => AppToaster.dismiss(id)} />
    </div>
  );
};

export const Toaster = observer(() => (
  <div id="toaster">
    {AppToaster.toastList.map((t) => (
      <Toast {...t} key={t.id} />
    ))}
  </div>
));
