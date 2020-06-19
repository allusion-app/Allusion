import React from 'react';

import { Checkbox, Switch } from 'components';

export default {
  component: Checkbox,
  title: 'Checkbox',
  decorators: [
    (storyFn: () => React.ReactNode) => <div className="app-theme bp3-light">{storyFn()}</div>,
  ],
};

export const CheckBox = () => {
  return <Checkbox label="Option" />;
};

export const SwitchCheckBox = () => {
  return <Switch label="ON" />;
};
