export interface InputElement<T>
  extends Omit<
    React.InputHTMLAttributes<HTMLInputElement>,
    'value' | 'onSubmit' | 'onAbort' | 'defaultValue'
  > {
  value?: T;
  defaultValue?: T;
  isValid?: (value: string) => boolean;
  onSubmit?: (target: EventTarget & HTMLInputElement) => void;
  onAbort?: (rawValue: string) => void;
}
export function handleBlur<T>(
  editable: boolean,
  isValid: (text: string) => boolean,
  setText: (text: T) => void,
  onSubmit?: (target: EventTarget & HTMLInputElement) => void
) {
  return (event: React.FocusEvent<HTMLInputElement>) => {
    if (editable) {
      const element = event.target as HTMLInputElement;
      if (isValid(element.value)) {
        setText((element.value.trim() as unknown) as T);
        onSubmit?.(element);
      }
    }
  };
}
export function handleFocus(editable: boolean) {
  return (event: React.FocusEvent<HTMLInputElement>) => {
    if (editable) {
      event.target.select();
    }
  };
}
export function handleInput(isValid: (text: string) => boolean) {
  return (event: React.FormEvent<HTMLInputElement>) => {
    const element = event.target as HTMLInputElement;
    element.setCustomValidity(isValid(element.value) ? '' : 'INVALID');
  };
}
export function handleInvalid(
  onInvalid: ((event: React.FormEvent<HTMLInputElement>) => void) | undefined
) {
  return (event: React.FormEvent<HTMLInputElement>) => {
    if (onInvalid) {
      return onInvalid(event);
    }
    event.preventDefault();
  };
}
export function handleEnter<T>(
  editable: boolean,
  isValid: (text: string) => boolean,
  setText: (text: T) => void,
  onSubmit?: (target: EventTarget & HTMLInputElement) => void,
  onAbort?: (rawValue: string) => void
) {
  return (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Enter') {
      return;
    }
    if (editable) {
      const element = event.target as HTMLInputElement;
      if (isValid(element.value)) {
        setText((element.value.trim() as unknown) as T);
        onSubmit?.(element);
      } else {
        onAbort?.(element.value);
      }
    }
  };
}
