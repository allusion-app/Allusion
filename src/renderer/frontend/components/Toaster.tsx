import { Button } from 'components/Button';
import { action, observable } from 'mobx';
import { observer } from 'mobx-react-lite';
import React, { ReactNode } from 'react';
import { ID } from 'src/renderer/entities/ID';
import { v4 as uuid } from 'uuid';

class ToastManager {
  readonly toastList = observable(new Array<IdentifiableToast>());
  timeouts = new Map<ID, number>();
  @action show(toast: IToastProps, id?: string) {
    const existing = this.toastList.findIndex((t) => t.id === id);
    if (id && existing !== -1) {
      this.toastList.splice(existing, 1, { ...toast, id });
      let to = this.timeouts.get(id);
      if (to) {
        window.clearTimeout(to);
      }
      if (toast.timeout !== 0) {
        to = window.setTimeout(() => this.dismiss(toastWithKey.id), toast.timeout);
        this.timeouts.set(id, to);
      }
      return existing;
    }
    const toastWithKey: IdentifiableToast = {
      ...toast,
      id: id || uuid(),
    };
    this.toastList.push(toastWithKey);

    if (toast.timeout !== 0) {
      const to = window.setTimeout(() => this.dismiss(toastWithKey.id), toast.timeout);
      this.timeouts.set(toastWithKey.id, to);
    }
    return toastWithKey;
  }
  @action dismiss(id: string) {
    const instance = this.toastList.find((t) => t.id === id);
    if (instance) {
      return this.toastList.remove(instance);
    }
    return false;
  }
}

// Create a singleton toaster - we should only be needing one
const AppToaster = new ToastManager();

// Demo of new toasts
// AppToaster.show({ message: 'First custom toast!', timeout: 0 });
// setTimeout(() => AppToaster.show({ message: 'Second custom toast!', timeout: 0 }), 5000);

interface IToastProps {
  message: string;
  icon?: ReactNode;
  timeout: number;
}

type IdentifiableToast = IToastProps & { id: ID };

const Toast = observer(({ message, icon, id }: IdentifiableToast) => {
  return (
    <div className="toast">
      {icon}
      <span>{message}</span>
      <Button text="Dismiss" onClick={() => AppToaster.dismiss(id)} />
    </div>
  );
});

export const Toaster = observer(() => (
  <div id="toaster">
    {AppToaster.toastList.map((t) => (
      <Toast {...t} key={t.id} />
    ))}
  </div>
));
