import style from './input.module.scss';
import React, { useEffect, useRef } from 'react';
import {
  // eslint-disable-next-line no-unused-vars
  InputElement,
  handleOnBlur,
  handleOnFocus,
  handleOnInput,
  handleOnInvalid,
  handleOnEnter
} from './InputElement';

interface TextInput extends InputElement<string> {
  setText: (text: string) => void;
}

/**
 * Editable text input.
 */
const TextInput = (props: TextInput) => {
  const {
    className,
    autoFocus,
    readOnly,
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
        className: `${style.input} ${style.text} ${className ?? ''}`,
        ref: input,
        type: 'text',
        readOnly,
        onBlur: p.onBlur ?? handleOnBlur(!readOnly, isValid, setText, onSubmit),
        onFocus: p.onFocus ?? handleOnFocus(!readOnly),
        onInput: p.onInput ?? handleOnInput(isValid),
        onChange: p.onChange ?? handleOnInput(isValid),
        onInvalid: handleOnInvalid(onInvalid),
        onKeyUp: p.onKeyUp ?? handleOnEnter(!readOnly, isValid, setText, onSubmit, onAbort)
      })}
    />
  );
};

export default TextInput;
