import style from './input.module.scss';
import React, { useEffect, useRef } from 'react';
import {
  // eslint-disable-next-line no-unused-vars
  InputElement,
  handleBlur,
  handleFocus,
  handleInput,
  handleInvalid,
  handleEnter
} from './InputElement';

interface NumberInput extends InputElement<number> {
  setValue: (value: number) => void;
}

/**
 * Editable number input.
 */
const NumberInput = (props: NumberInput) => {
  const {
    className,
    autoFocus,
    readOnly,
    value,
    defaultValue,
    setValue,
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
        className: `${style.input} ${style.number} ${className ?? ''}`,
        ref: input,
        defaultValue: defaultValue ? `${defaultValue}` : undefined,
        value,
        type: 'number',
        readOnly,
        onBlur: p.onBlur ?? handleBlur(!readOnly, isValid, setValue, onSubmit),
        onFocus: p.onFocus ?? handleFocus(!readOnly),
        onInput: p.onInput ?? handleInput(isValid),
        onChange: p.onChange ?? handleInput(isValid),
        onInvalid: handleInvalid(onInvalid),
        onKeyUp: p.onKeyUp ?? handleEnter(!readOnly, isValid, setValue, onSubmit, onAbort)
      })}
    />
  );
};

export default NumberInput;
