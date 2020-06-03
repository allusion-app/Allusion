import React from 'react';

import { Select } from 'components';

export default {
  component: Select,
  title: 'Select',
};

export const Default = () => {
  return (
    <Select>
      <option key="tags" value="tags">
        Tags
      </option>
      <option key="name" value="name">
        File name
      </option>
      <option key="path" value="path">
        File path
      </option>
      <option key="extension" value="extension">
        File type
      </option>
      <option key="size" value="size">
        File size (MB)
      </option>
      <option key="dateAdded" value="dateAdded">
        Date added
      </option>
    </Select>
  );
};
