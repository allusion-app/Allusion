import React from 'react';

import { NumberInput } from 'components';

export default {
  component: NumberInput,
  title: 'Input/Number',
  decorators: [
    (storyFn: () => React.ReactNode) => <div className="app-theme bp3-light">{storyFn()}</div>,
  ],
};

export const Default = () => {
  return <NumberInput placeholder="Enter a number!" setValue={(value) => console.log(value)} />;
};
