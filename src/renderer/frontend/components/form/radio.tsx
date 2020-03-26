import React, { useCallback } from 'react';

interface IRadio {
  className?: string;
  name?: string;
  label: string;
  value: string;
  isChecked?: boolean;
  onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

const Radio = ({ className = '', label, name, value, isChecked, onChange = () => {} }: IRadio) => {
  return (
    <label>
      <input
        className={className}
        name={name}
        type="radio"
        checked={isChecked}
        value={value}
        onChange={onChange}
      />
      {label}
    </label>
  );
};

interface IRadioGroup {
  name: string;
  checkedValue?: string;
  children: React.ReactElement<IRadio>[];
  setValue: (value: string) => void;
}

const RadioGroup = ({ name, checkedValue, children, setValue }: IRadioGroup) => {
  const handleOnChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setValue(event.target.value);
    },
    [setValue],
  );
  return (
    <>
      {children.map((c) => (
        <Radio
          key={c.props.value}
          {...{
            ...c.props,
            name,
            isChecked: checkedValue === c.props.value,
            onChange: handleOnChange,
          }}
        />
      ))}
    </>
  );
};

export { Radio, RadioGroup };
