import React from 'react';

import { TextInput, NumberInput } from './input';
import { Radio, RadioGroup } from './radio';

export interface FormElement<T = string, E extends HTMLElement = HTMLInputElement> {
  className?: string;
  disabled?: boolean;
  name?: string;
  required?: boolean;
  value: T;
  onChange?: (event: React.ChangeEvent<E>) => void;
}

interface ISelect extends FormElement<string | string[], HTMLSelectElement> {
  multiple?: boolean;
  children: React.ReactElement<
    React.DetailedHTMLProps<React.OptionHTMLAttributes<HTMLOptionElement>, HTMLOptionElement>
  >[];
}

const Select = ({
  className,
  disabled,
  name,
  required,
  value,
  onChange,
  multiple,
  children,
}: ISelect) => {
  return (
    <div className={'select-wrapper'}>
      <select
        className={className}
        disabled={disabled}
        name={name}
        required={required}
        defaultValue={value}
        onChange={onChange}
        multiple={multiple}
      >
        {children}
      </select>
    </div>
  );
};

export { TextInput, NumberInput, Radio, RadioGroup, Select };
