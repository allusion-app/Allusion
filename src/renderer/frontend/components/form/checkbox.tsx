import React from 'react';

interface ICheckbox extends React.HTMLAttributes<HTMLInputElement> {
  label: string;
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
