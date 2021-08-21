import './radio.scss';
import React, { useEffect, useRef } from 'react';

interface RadioProps {
  label: string;
  defaultChecked?: boolean;
  checked?: boolean;
  value: string;
  onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

const Radio = (props: RadioProps) => {
  const { label, value, defaultChecked, checked, onChange } = props;
  return (
    <label>
      <input
        type="radio"
        value={value}
        defaultChecked={defaultChecked}
        checked={checked}
        onChange={onChange}
      />
      {label}
    </label>
  );
};

interface RadioGroupProps {
  name: string;
  children: React.ReactElement<RadioProps>[];
  orientation?: 'horizontal' | 'vertical';
}

const RadioGroup = ({ name, orientation = 'vertical', children }: RadioGroupProps) => {
  const group = useRef<HTMLFieldSetElement>(null);
  useEffect(() => {
    if (group.current) {
      const radios = group.current.querySelectorAll('input[type="radio"]');
      radios.forEach((r) => r.setAttribute('name', name));
    }
  }, [name, children.length]);

  return (
    <fieldset ref={group} role="radiogroup" aria-orientation={orientation}>
      <legend>{name}</legend>
      {children}
    </fieldset>
  );
};

export { Radio, RadioGroup };
