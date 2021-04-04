import React from 'react';
import { IconSet } from 'widgets/Icons';

interface ICallout {
  header?: React.ReactText;
  children: React.ReactNode;
}

// Everything is hard coded. If you want to make it re-usable, you're free to do
// so. However, do not make the icon optional because it will make things visually
// inconsistent.
export const Callout = ({ header, children }: ICallout) => {
  return (
    <div className="callout">
      <span className="callout-icon">{IconSet.INFO}</span>
      <span className="callout-header">{header}</span>
      <div className="callout-body">{children}</div>
    </div>
  );
};
