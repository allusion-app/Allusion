import React, { useEffect, useRef } from 'react';
import {
  InputElement,
  handleOnBlur,
  handleOnFocus,
  handleOnInput,
  handleOnInvalid,
  handleOnEnter,
} from './index';

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

export default TextInput;
