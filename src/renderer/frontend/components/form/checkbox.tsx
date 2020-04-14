import React from 'react';

interface ICheckbox<T = string> {
  className?: string;
  disabled?: boolean;
  name?: string;
  required?: boolean;
  value?: T;
  onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
  label: string;
  defaultChecked?: boolean;
}

const Switch = (props: ICheckbox) => {
  const { label, ...p } = props;
  return (
    <label>
      <input data-subtype-switch {...p} type="checkbox" />
      {label}
    </label>
  );
};

const Checkbox = (props: ICheckbox) => {
  const { label, ...p } = props;
  return (
    <label>
      <input {...p} type="checkbox" />
      {label}
    </label>
  );
};

export { Switch, Checkbox };
