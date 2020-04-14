/* eslint-disable @typescript-eslint/no-empty-function */
import React, { useEffect, useRef } from 'react';

import {
  InputElement,
  handleOnBlur,
  handleOnFocus,
  handleOnInput,
  handleOnInvalid,
  handleOnEnter,
} from './index';

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
  autoFocus,
  className,
  disabled,
  placeholder,
  readonly,
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
      if (autoFocus && !readonly) {
        input.current.focus();
      }
      if (readonly) {
        input.current.setSelectionRange(0, 0);
      }
    }
  }, [readonly, autoFocus]);
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
      readOnly={readonly}
      onBlur={handleOnBlur(onBlur, !readonly, isValid, setValue, onSubmit, value)}
      onFocus={handleOnFocus(onFocus, !readonly)}
      onInput={handleOnInput(onInput, isValid)}
      onInvalid={handleOnInvalid(onInvalid)}
      onKeyUp={handleOnEnter(!readonly, isValid, setValue, onSubmit, onAbort)}
    />
  );
};

export default NumberInput;
