/* eslint-disable react/display-name */
import React from 'react';

interface ICheckbox<T = string> {
  className?: string;
  disabled?: boolean;
  name?: string;
  required?: boolean;
  value?: T;
  onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
  label: string;
  checked?: boolean;
}

const Switch = React.memo(({ className, label, name, value, checked, onChange }: ICheckbox) => {
  return (
    <label>
      <input
        data-subtype-switch
        className={className}
        name={name}
        type="checkbox"
        defaultChecked={checked}
        value={value}
        onChange={onChange}
      />
      {label}
    </label>
  );
});

const Checkbox = React.memo(({ className, label, name, value, checked, onChange }: ICheckbox) => {
  return (
    <label>
      <input
        className={className}
        name={name}
        type="checkbox"
        defaultChecked={checked}
        value={value}
        onChange={onChange}
      />
      {label}
    </label>
  );
});

export { Switch, Checkbox };
