import React from 'react';

interface IRadio extends React.HTMLAttributes<HTMLInputElement> {
  label: string;
  value?: string;
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

interface IRadioGroup extends React.HTMLAttributes<HTMLInputElement> {
  name: string;
  value?: string;
  disabled?: boolean;
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
