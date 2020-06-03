import style from './select.module.scss';
import input from '../Input/input.module.scss';
import React from 'react';

const Select = (
  props: React.DetailedHTMLProps<React.SelectHTMLAttributes<HTMLSelectElement>, HTMLSelectElement>,
) => {
  const { children, className, ...p } = props;
  return (
    <div className={`${input.input} ${style.select} ${className ?? ''}`}>
      <select {...p}>{children}</select>
    </div>
  );
};

export { Select };
