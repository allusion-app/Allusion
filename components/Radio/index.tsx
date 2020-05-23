import style from './radio.module.scss';
import input from '../Input/input.module.scss';
import React from 'react';

interface IRadio extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  value?: string;
}

const Radio = (props: IRadio) => {
  const { label, className, ...p } = props;
  return (
    <label className={input.label}>
      <input className={`${input.input} ${style.radio} ${className ?? ''}`} {...p} type="radio" />
      {label}
    </label>
  );
};

interface IRadioGroup extends React.InputHTMLAttributes<HTMLInputElement> {
  name: string;
  value?: string;
  children: React.ReactElement<IRadio>[];
  inline?: boolean;
}

const Group = ({ name, disabled, value, children, onChange, className, inline }: IRadioGroup) => {
  return (
    <fieldset
      style={inline ? ({ '--display': 'inline-block' } as React.CSSProperties) : undefined}
      className={`${style.radio_group} ${className ?? ''}`}
    >
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
