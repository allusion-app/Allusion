import React from 'react';

interface InfoButtonProps {
  children: React.ReactNode;
}

export const InfoButton = ({ children }: InfoButtonProps) => {
  return (
    <details className="info-button">
      <summary>
        <span className="visually-hidden">Show Help</span>
      </summary>
      <div data-popover>{children}</div>
    </details>
  );
};
