import React, { ReactNode } from 'react';
import { Collapse } from 'src/frontend/components/Collapse';

export type MultiSplitPaneProps = React.HTMLAttributes<HTMLDivElement> & {
  id: string;
  title: string;
  // height: number;
  /** Will be set by the MultiSplit parent */
  isCollapsed?: boolean;
  /** Will be set by the MultiSplit parent */
  setCollapsed?: (isCollapsed: boolean) => void;
  headerProps?: React.HTMLAttributes<HTMLDivElement>;
  headerToolbar?: ReactNode;
  className?: string;
};

const MultiSplitPane: React.FC<MultiSplitPaneProps> = ({
  title,
  isCollapsed,
  setCollapsed,
  // height,
  children,
  className,
  headerToolbar,
  headerProps,
  ...props
}) => {
  return (
    <div className={`section ${className || ''}`} {...props}>
      <header {...(headerProps || {})}>
        <h2 onClick={() => setCollapsed?.(!isCollapsed)}>{title}</h2>
        {headerToolbar}
      </header>
      <Collapse open={!isCollapsed}>{children}</Collapse>
    </div>
  );
};

export default MultiSplitPane;
