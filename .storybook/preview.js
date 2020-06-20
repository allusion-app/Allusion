import './style.scss';
import 'resources/style/theme.scss';
import React from 'react';
import { addDecorator } from '@storybook/react';

addDecorator((storyFn) =>
  React.createElement('div', { className: 'app-theme bp3-light', children: storyFn() }),
);
