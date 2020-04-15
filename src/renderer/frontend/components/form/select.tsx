import React from 'react';

const Select = (
  props: React.DetailedHTMLProps<React.SelectHTMLAttributes<HTMLSelectElement>, HTMLSelectElement>,
) => {
  const { children, ...p } = props;
  return (
    <div className="select-wrapper">
      <select {...p}>{children}</select>
    </div>
  );
};

export { Select };
