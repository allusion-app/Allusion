import React from 'react';

import { NumberInput } from 'components';

export default {
  component: NumberInput,
  title: 'Input/Number'
};

export const Default = () => {
  return <NumberInput placeholder="Enter a number!" setValue={(value) => console.log(value)} />;
};
