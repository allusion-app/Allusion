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
        onBlur: p.onBlur ?? handleOnBlur(!readOnly, isValid, setValue, onSubmit),
        onFocus: p.onFocus ?? handleOnFocus(!readOnly),
        onInput: p.onInput ?? handleOnInput(isValid),
        onChange: p.onChange ?? handleOnInput(isValid),
        onInvalid: handleOnInvalid(onInvalid),
        onKeyUp: p.onKeyUp ?? handleOnEnter(!readOnly, isValid, setValue, onSubmit, onAbort)
      })}
    />
  );
};

export default NumberInput;
