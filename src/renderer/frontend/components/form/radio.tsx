/* eslint-disable react/display-name */
import React from 'react';
import { Input } from './input';

interface IRadio extends Input {
  label: string;
  checked?: boolean;
}

const Radio = React.memo(({ className, label, name, value, checked, onChange }: IRadio) => {
  return (
    <label>
      <input
        className={className}
        name={name}
        type="radio"
        checked={checked}
        value={value}
        onChange={onChange}
      />
      {label}
    </label>
  );
});

interface IRadioGroup extends Input {
  name: string;
  children: React.ReactElement<IRadio>[];
}

const RadioGroup = React.memo(({ name, disabled, value, children, onChange }: IRadioGroup) => {
  return (
    <fieldset>
      <legend>{name}</legend>
      {children.map(({ props }) => (
        <Radio
          disabled={disabled}
          className={props.className}
          name={name}
          key={props.value}
          value={props.value}
          label={props.label}
          onChange={props.onChange ?? onChange}
          checked={value === props.value}
        />
      ))}
    </fieldset>
  );
});

export { Radio, RadioGroup };
