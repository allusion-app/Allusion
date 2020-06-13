import React from 'react';

import { Checkbox, Switch } from 'components';

export default {
  component: Checkbox,
  title: 'Checkbox',
};

export const CheckBox = () => {
  return <Checkbox label="Option" />;
};

export const SwitchCheckBox = () => {
  return <Switch label="ON" />;
};
