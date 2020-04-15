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
  setValue: (value: number) => void;
}

const NumberInput = (props: NumberInput) => {
  const {
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
        ref: input,
        defaultValue: defaultValue ? `${defaultValue}` : undefined,
        value,
        type: 'number',
        readOnly,
        onBlur:
          p.onBlur ?? handleOnBlur(!readOnly, isValid, setValue, onSubmit, value ?? defaultValue),
        onFocus: p.onFocus ?? handleOnFocus(!readOnly),
        onInput: p.onInput ?? handleOnInput(isValid),
        onChange: p.onChange ?? handleOnInput(isValid),
        onInvalid: handleOnInvalid(onInvalid),
        onKeyUp: p.onKeyUp ?? handleOnEnter(!readOnly, isValid, setValue, onSubmit, onAbort),
      })}
    />
  );
};

export default NumberInput;
