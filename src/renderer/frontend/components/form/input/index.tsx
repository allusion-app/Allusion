import React from 'react';
import { FormElement } from '..';
import TextInput from './TextInput';
import NumberInput from './NumberInput';

export interface InputElement<T> extends FormElement<T> {
  focusOnEdit?: boolean;
  placeholder: string;
  readonly?: boolean;
  isValid?: (value: string) => boolean;
  onSubmit?: (target: EventTarget & HTMLInputElement) => void;
  onBlur?: (event: React.FocusEvent<HTMLInputElement>) => void;
  onInput?: (event: React.FormEvent<HTMLInputElement>) => void;
  onFocus?: (event: React.FocusEvent<HTMLInputElement>) => void;
  onInvalid?: (event: React.FormEvent<HTMLInputElement>) => void;
  onAbort?: (rawValue: string) => void;
}

export function handleOnBlur<T>(
  onBlur: ((event: React.FocusEvent<HTMLInputElement>) => void) | undefined,
  editable: boolean,
  isValid: (text: string) => boolean,
  setText: (text: T) => void,
  onSubmit: (target: EventTarget & HTMLInputElement) => void,
  text: T,
) {
  return (event: React.FocusEvent<HTMLInputElement>) => {
    if (onBlur) {
      return onBlur(event);
    }
    if (editable) {
      const element = event.target as HTMLInputElement;
      if (isValid(element.value)) {
        setText((element.value.trim() as unknown) as T);
        onSubmit(element);
      } else {
        element.value = `${text}`;
      }
    }
  };
}

export function handleOnFocus(
  onFocus: ((event: React.FocusEvent<HTMLInputElement>) => void) | undefined,
  editable: boolean,
) {
  return (event: React.FocusEvent<HTMLInputElement>) => {
    if (onFocus) {
      return onFocus(event);
    }
    if (editable) {
      event.target.select();
    }
  };
}

export function handleOnInput(
  onInput: ((event: React.FormEvent<HTMLInputElement>) => void) | undefined,
  isValid: (text: string) => boolean,
) {
  return (event: React.FormEvent<HTMLInputElement>) => {
    if (onInput) {
      return onInput(event);
    }
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
  onSubmit: (target: EventTarget & HTMLInputElement) => void,
  onAbort: (rawValue: string) => void,
) {
  return (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Enter') {
      return;
    }
    if (editable) {
      const element = event.target as HTMLInputElement;
      if (isValid(element.value)) {
        setText((element.value.trim() as unknown) as T);
        onSubmit(element);
        event.currentTarget.setSelectionRange(0, 0);
      } else {
        onAbort(element.value);
      }
    }
  };
}

export { TextInput, NumberInput };
