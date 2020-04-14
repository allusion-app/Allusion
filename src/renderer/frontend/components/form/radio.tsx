import React from 'react';
import { FormElement } from './index';

interface IRadio extends FormElement {
  label: string;
  defaultChecked?: boolean;
}

const Radio = (props: IRadio) => {
  const { label, ...p } = props;
  return (
    <label>
      <input {...p} type="radio" />
      {label}
    </label>
  );
};

interface IRadioGroup extends FormElement {
  name: string;
  children: React.ReactElement<IRadio>[];
}

const Group = ({ name, disabled, value, children, onChange }: IRadioGroup) => {
  return (
    <fieldset>
      <legend>{name}</legend>
      {children.map(({ props }) => (
        <Radio
          key={props.value}
          {...Object.assign(
            {
              disabled,
              name,
              onChange,
              defaultChecked: value === props.value,
            },
            props,
          )}
        />
      ))}
    </fieldset>
  );
};

const RadioGroup = React.memo(Group);

export { Radio, RadioGroup };
