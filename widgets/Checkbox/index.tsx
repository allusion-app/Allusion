import './checkbox.scss';
import React, { ReactNode } from 'react';

type ToggleProps = {
  checked: boolean;
  onChange: (value: boolean) => void;
  children: ReactNode;
};

const Toggle = ({ checked, onChange, children }: ToggleProps) => {
  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    onChange(event.currentTarget.checked);
  };

  return (
    <label>
      <input data-toggle type="checkbox" checked={checked} onChange={handleChange} />
      {children}
    </label>
  );
};

type CheckboxProps = {
  checked: boolean | undefined;
  onChange: (value: boolean) => void;
  children: ReactNode;
};

const Checkbox = ({ checked, onChange, children }: CheckboxProps) => {
  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    onChange(event.currentTarget.checked);
  };

  return (
    <label>
      <input type="checkbox" checked={checked} onChange={handleChange} />
      {children}
    </label>
  );
};

export { Toggle, Checkbox };
