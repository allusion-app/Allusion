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
  defaultChecked?: boolean;
}

const Switch = React.memo((props: ICheckbox) => {
  return (
    <label>
      <input data-subtype-switch {...props} type="checkbox" />
      {props.label}
    </label>
  );
});

const Checkbox = React.memo((props: ICheckbox) => {
  return (
    <label>
      <input {...props} type="checkbox" />
      {props.label}
    </label>
  );
});

export { Switch, Checkbox };
