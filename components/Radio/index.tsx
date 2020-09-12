import './radio.scss';
import React, { useEffect, useRef } from 'react';
import { observer } from 'mobx-react-lite';

interface IRadio {
  label: string;
  defaultChecked?: boolean;
  checked?: boolean;
  value: string;
  onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
  disabled?: boolean;
}

const Radio = observer((props: IRadio) => {
  const { label, value, defaultChecked, checked, disabled, onChange } = props;
  return (
    <label>
      <input
        type="radio"
        value={value}
        defaultChecked={defaultChecked}
        checked={checked}
        disabled={disabled}
        onChange={onChange}
      />
      {label}
    </label>
  );
});

interface IRadioGroup {
  name: string;
  children: React.ReactElement<IRadio>[];
}

const RadioGroup = observer(({ name, children }: IRadioGroup) => {
  const group = useRef<HTMLFieldSetElement>(null);
  useEffect(() => {
    if (group.current) {
      const radios = group.current.querySelectorAll('input[type="radio"]');
      radios.forEach((r) => r.setAttribute('name', name));
    }
  }, [name, children.length]);

  return (
    <fieldset ref={group} role="radiogroup">
      <legend>{name}</legend>
      {children}
    </fieldset>
  );
});

export { Radio, RadioGroup };
