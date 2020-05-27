import React from 'react';

import { Radio, RadioGroup } from 'components';

export default {
  component: Radio,
  title: 'Radio'
};

export const Default = () => {
  return (
    <RadioGroup name="Gender" value="female">
      <Radio label="male" value="male" />
      <Radio label="female" value="female" />
      <Radio label="diverse" value="diverse" />
    </RadioGroup>
  );
};
