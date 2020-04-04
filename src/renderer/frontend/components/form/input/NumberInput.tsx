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

export default NumberInput;
