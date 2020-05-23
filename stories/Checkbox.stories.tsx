import React from 'react';

import { Checkbox, Toggle } from '../components';

export default {
  component: Checkbox,
  title: 'Checkbox'
};

export const CheckBox = () => {
  return <Checkbox label="Option" />;
};

export const ToggleCheckBox = () => {
  return <Toggle label="ON" />;
};
