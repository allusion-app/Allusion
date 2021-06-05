import './checkbox.scss';
import React from 'react';

interface IToggle {
  checked?: boolean;
  onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onLabel?: string;
  offLabel?: string;
}

const Toggle = (props: IToggle) => {
  const { checked, onChange, onLabel = 'On', offLabel = 'Off' } = props;
  return (
    <label className="toggle">
      <input role="switch" type="checkbox" checked={checked} onChange={onChange} />
      {checked ? onLabel : offLabel}
    </label>
  );
};

interface ICheckbox {
  label: string;
  checked?: boolean;
  defaultChecked?: boolean;
  onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

const Checkbox = (props: ICheckbox) => {
  const { label, defaultChecked, checked, onChange } = props;
  return (
    <label className="checkbox">
      {label}
      <input
        type="checkbox"
        defaultChecked={defaultChecked}
        checked={checked}
        onChange={onChange}
      />
    </label>
  );
};

export { Toggle, Checkbox };
