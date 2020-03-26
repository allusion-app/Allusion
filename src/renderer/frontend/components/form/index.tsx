import React from 'react';

import { TextInput, NumberInput } from './input';
import { Radio, RadioGroup } from './radio';

const Select = (
  props: React.DetailedHTMLProps<React.SelectHTMLAttributes<HTMLSelectElement>, HTMLSelectElement>,
) => {
  return (
    <div className={'select-wrapper'}>
      <select {...props}>{props.children}</select>
    </div>
  );
};

export { TextInput, NumberInput, Radio, RadioGroup, Select };
