import React, { useEffect, useRef } from 'react';
import { FormElement } from '.';

interface InputElement<T> extends FormElement<T> {
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

function handleOnBlur<T>(
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

function handleOnFocus(
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

function handleOnInput(
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

function handleOnInvalid(
  onInvalid: ((event: React.FormEvent<HTMLInputElement>) => void) | undefined,
) {
  return (event: React.FormEvent<HTMLInputElement>) => {
    if (onInvalid) {
      return onInvalid(event);
    }
    event.preventDefault();
  };
}

function handleOnEnter<T>(
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

interface TextInput extends InputElement<string> {
  setText: (text: string) => void;
}

/**
 * Editable text input.
 *
 * The text cannot be null, undefined or empty.
 * @param param0
 */
const TextInput = ({
  focusOnEdit = false,
  className,
  disabled,
  placeholder,
  readonly,
  required,
  value = '',
  setText,
  isValid = () => true,
  onAbort = () => {},
  onBlur,
  onInput,
  onFocus,
  onInvalid,
  onSubmit = () => {},
}: TextInput) => {
  const input = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (input.current) {
      if (focusOnEdit && !readonly) {
        input.current.focus();
      }
      if (readonly) {
        input.current.setSelectionRange(0, 0);
      }
    }
  }, [readonly, focusOnEdit]);

  return (
    <input
      spellCheck={false}
      ref={input}
      className={className}
      defaultValue={value}
      type="text"
      disabled={disabled}
      placeholder={placeholder}
      required={required}
      readOnly={readonly}
      onBlur={handleOnBlur(onBlur, !readonly, isValid, setText, onSubmit, value)}
      onFocus={handleOnFocus(onFocus, !readonly)}
      onInput={handleOnInput(onInput, isValid)}
      onInvalid={handleOnInvalid(onInvalid)}
      onKeyUp={handleOnEnter(!readonly, isValid, setText, onSubmit, onAbort)}
    />
  );
};

interface NumberInput extends InputElement<number> {
  min?: number;
  max?: number;
  step?: number;
  setValue: (value: number) => void;
}

const NumberInput = ({
  min,
  max,
  step,
  focusOnEdit = false,
  className,
  disabled,
  placeholder,
  readonly: editable = true,
  required,
  value,
  setValue,
  isValid = () => true,
  onAbort = () => {},
  onBlur,
  onInput,
  onFocus,
  onInvalid,
  onSubmit = () => {},
}: NumberInput) => {
  const input = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (input.current) {
      if (focusOnEdit && editable) {
        input.current.focus();
      }
      if (!editable) {
        input.current.setSelectionRange(0, 0);
      }
    }
  }, [editable, focusOnEdit]);

  return (
    <input
      ref={input}
      min={min}
      max={max}
      step={step}
      className={className}
      defaultValue={`${value}`}
      type="number"
      disabled={disabled}
      placeholder={placeholder}
      required={required}
      readOnly={!editable}
      onBlur={handleOnBlur(onBlur, editable, isValid, setValue, onSubmit, value)}
      onFocus={handleOnFocus(onFocus, editable)}
      onInput={handleOnInput(onInput, isValid)}
      onInvalid={handleOnInvalid(onInvalid)}
      onKeyUp={handleOnEnter(editable, isValid, setValue, onSubmit, onAbort)}
    />
  );
};

export { TextInput, NumberInput };
