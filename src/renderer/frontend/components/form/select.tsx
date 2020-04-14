import React from 'react';
import { FormElement } from './index';

interface ISelect extends FormElement<string | string[], HTMLSelectElement> {
  multiple?: boolean;
  children: React.ReactElement<
    React.DetailedHTMLProps<React.OptionHTMLAttributes<HTMLOptionElement>, HTMLOptionElement>
  >[];
}

const Select = (props: ISelect) => {
  return (
    <div className={'select-wrapper'}>
      <select {...props} value={undefined} defaultValue={props.value}>
        {props.children}
      </select>
    </div>
  );
};

export { Select };
