import './radio.scss';
import React, { useEffect, useRef } from 'react';

interface IRadio {
  label: string;
  defaultChecked?: boolean;
  checked?: boolean;
  value: string;
  onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

const Radio = (props: IRadio) => {
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

interface IRadioGroup {
  name: string;
  children: React.ReactElement<IRadio>[];
}

const RadioGroup = ({ name, children }: IRadioGroup) => {
  const group = useRef<HTMLFieldSetElement>(null);
  useEffect(() => {
    if (group.current) {
      const radios = group.current.querySelectorAll('input[type="radio"]');
      radios.forEach((r) => r.setAttribute('name', name));
    }
  }, [name, children.length]);

  return (
    // CHROME BUG: Cannot set flex on fieldset, instead use the inner div as flex container!
    <fieldset ref={group} role="radiogroup">
      <div>
        <legend>{name}</legend>
        {children}
      </div>
    </fieldset>
  );
};

export { Radio, RadioGroup };
