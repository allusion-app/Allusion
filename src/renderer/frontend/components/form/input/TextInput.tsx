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
const TextInput = (props: TextInput) => {
  const {
    autoFocus,
    readOnly,
    value,
    defaultValue,
    setText,
    isValid = () => true,
    onAbort,
    onInvalid,
    onSubmit,
    ...p
  } = props;
  const input = useRef<HTMLInputElement | null>(null);
  useEffect(() => {
    if (input.current) {
      if (autoFocus && !readOnly) {
        input.current.focus();
      }
      if (readOnly) {
        input.current.setSelectionRange(0, 0);
      }
    }
  }, [readOnly, autoFocus]);

  return (
    <input
      {...Object.assign(p, {
        ref: input,
        type: 'text',
        readOnly,
        onBlur:
          p.onBlur ?? handleOnBlur(!readOnly, isValid, setText, onSubmit, value ?? defaultValue),
        onFocus: p.onFocus ?? handleOnFocus(!readOnly),
        onInput: p.onInput ?? handleOnInput(isValid),
        onChange: p.onChange ?? handleOnInput(isValid),
        onInvalid: handleOnInvalid(onInvalid),
        onKeyUp: p.onKeyUp ?? handleOnEnter(!readOnly, isValid, setText, onSubmit, onAbort),
      })}
    />
  );
};

export default TextInput;
