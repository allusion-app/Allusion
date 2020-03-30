/* eslint-disable react/display-name */
import React from 'react';
import { FormElement } from './index';

interface IRadio extends FormElement {
  label: string;
  defaultChecked?: boolean;
}

const Radio = React.memo((props: IRadio) => {
  return (
    <label>
      <input {...props} type="radio" />
      {props.label}
    </label>
  );
});

interface IRadioGroup extends FormElement {
  name: string;
  children: React.ReactElement<IRadio>[];
}

const RadioGroup = React.memo(({ name, disabled, value, children, onChange }: IRadioGroup) => {
  return (
    <fieldset>
      <legend>{name}</legend>
      {children.map(({ props }) => (
        <Radio
          {...props}
          disabled={disabled}
          name={name}
          key={props.value}
          onChange={props.onChange ?? onChange}
          defaultChecked={value === props.value}
        />
      ))}
    </fieldset>
  );
});

export { Radio, RadioGroup };
