import React from 'react';
import { FormElement } from './index';

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

export { Select };
