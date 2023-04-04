import './radio.scss';
import React, { ReactNode, useContext, useMemo } from 'react';

type RadioProps = {
  value: string;
  children: ReactNode;
};

const Radio = ({ value, children }: RadioProps) => {
  const { name, handleChange } = useContext(PropsContext);
  const checked = useContext(StateContext);

  return (
    <label>
      <input
        type="radio"
        name={name}
        value={value}
        checked={value === checked}
        onChange={handleChange}
      />
      {children}
    </label>
  );
};

type RadioGroupProps<T extends string = any> = {
  name: string;
  value: T;
  onChange: (value: T) => void;
  children: React.ReactElement<RadioProps>[];
  orientation?: 'horizontal' | 'vertical';
};

const RadioGroup = ({
  name,
  value,
  onChange,
  children,
  orientation = 'vertical',
}: RadioGroupProps) => {
  const props = useMemo<PropsContext>(
    () => ({
      name,
      handleChange: (event) => {
        onChange(event.currentTarget.value);
      },
    }),
    [name, onChange],
  );

  return (
    <fieldset role="radiogroup" aria-orientation={orientation}>
      <legend className="visually-hidden">{name}</legend>
      <div className="radiogroup-name">{name}</div>
      <PropsContext.Provider value={props}>
        <StateContext.Provider value={value}>{children}</StateContext.Provider>
      </PropsContext.Provider>
    </fieldset>
  );
};

export { Radio, RadioGroup };

type PropsContext = {
  name: string;
  handleChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
};

const PropsContext = React.createContext<PropsContext>({} as any);
const StateContext = React.createContext<string>('');
