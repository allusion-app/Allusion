import './checkbox.scss';
import React from 'react';

interface ICheckbox {
  label: string;
  checked?: boolean;
  defaultChecked?: boolean;
  onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

const Toggle = (props: ICheckbox) => {
  const { label, defaultChecked, checked, onChange } = props;
  return (
    <label>
      <input
        data-toggle
        type="checkbox"
        defaultChecked={defaultChecked}
        checked={checked}
        onChange={onChange}
      />
      {label}
    </label>
  );
};

const Checkbox = (props: ICheckbox) => {
  const { label, defaultChecked, checked, onChange } = props;
  return (
    <label>
      <input
        type="checkbox"
        defaultChecked={defaultChecked}
        checked={checked}
        onChange={onChange}
      />
      {label}
    </label>
  );
};

export { Toggle, Checkbox };
