import React from 'react';
import TextInput from './TextInput';
import NumberInput from './NumberInput';

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

export function handleOnBlur<T>(
  editable: boolean,
  isValid: (text: string) => boolean,
  setText: (text: T) => void,
  onSubmit?: (target: EventTarget & HTMLInputElement) => void,
  defaultValue?: T,
) {
  return (event: React.FocusEvent<HTMLInputElement>) => {
    if (editable) {
      const element = event.target as HTMLInputElement;
      if (isValid(element.value)) {
        setText((element.value.trim() as unknown) as T);
        onSubmit?.(element);
      } else {
        element.value = `${defaultValue}`;
      }
    }
  };
}

export function handleOnFocus(editable: boolean) {
  return (event: React.FocusEvent<HTMLInputElement>) => {
    if (editable) {
      event.target.select();
    }
  };
}

export function handleOnInput(isValid: (text: string) => boolean) {
  return (event: React.FormEvent<HTMLInputElement>) => {
    const element = event.target as HTMLInputElement;
    element.setCustomValidity(isValid(element.value) ? '' : 'INVALID');
  };
}

export function handleOnInvalid(
  onInvalid: ((event: React.FormEvent<HTMLInputElement>) => void) | undefined,
) {
  return (event: React.FormEvent<HTMLInputElement>) => {
    if (onInvalid) {
      return onInvalid(event);
    }
    event.preventDefault();
  };
}

export function handleOnEnter<T>(
  editable: boolean,
  isValid: (text: string) => boolean,
  setText: (text: T) => void,
  onSubmit?: (target: EventTarget & HTMLInputElement) => void,
  onAbort?: (rawValue: string) => void,
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
        event.currentTarget.setSelectionRange(0, 0);
      } else {
        onAbort?.(element.value);
      }
    }
  };
}

export { TextInput, NumberInput };
