import style from './checkbox.module.scss';
import input from '../Input/input.module.scss';

import React from 'react';

interface ICheckbox extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

const Switch = (props: ICheckbox) => {
  const { label, className, ...p } = props;
  return (
    <label className={input['input-label']}>
      <input
        className={`${input.input} ${style.checkbox} ${style.toggle} ${className ?? ''}`}
        {...p}
        type="checkbox"
      />
      <span className={input['input-label-spacer']} />
      {label}
    </label>
  );
};

const Checkbox = (props: ICheckbox) => {
  const { label, className, ...p } = props;
  return (
    <label className={input['input-label']}>
      <input
        className={`${input.input} ${style.checkbox} ${className ?? ''}`}
        {...p}
        type="checkbox"
      />
      <span className={input['input-label-spacer']} />
      {label}
    </label>
  );
};

export { Switch, Checkbox };
