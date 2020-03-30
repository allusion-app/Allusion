import React from 'react';

import { TextInput, NumberInput } from './input';
import { Radio, RadioGroup } from './radio';
import { Select } from './select';
import { Switch, Checkbox } from './checkbox';

export interface FormElement<T = string, E extends HTMLElement = HTMLInputElement> {
  className?: string;
  disabled?: boolean;
  name?: string;
  required?: boolean;
  value: T;
  onChange?: (event: React.ChangeEvent<E>) => void;
}

export { TextInput, NumberInput, Radio, RadioGroup, Select, Switch, Checkbox };
