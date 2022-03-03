import React, { ReactNode, useCallback } from 'react';
import './multisplit.scss';
import { MultiSplitPaneProps } from './MultiSplitPane';

/**
 * New vision:
 * - Stick collapsed panels at the bottom
 * - No draggable separators
 */

interface MultiSplitProps {
  /** Whether each panel is expanded or not. Size N */
  expansion: boolean[];
  /** when a panel is (un)expanded */
  onUpdateExpansion: (expansion: boolean[]) => void;
  /** Must be of type widgets/MultiSplit/Pane */
  children: ReactNode[];
}

const MultiSplit: React.FC<MultiSplitProps> = ({ children, expansion, onUpdateExpansion }) => {
  const handleToggleExpansion = useCallback(
    (index: number, expand: boolean) => {
      const newExpansion = [...expansion];
      newExpansion[index] = expand;
      onUpdateExpansion(newExpansion);
    },
    [expansion, onUpdateExpansion],
  );

  const lastExpandedPanelIndex = expansion.lastIndexOf(true);

  return (
    <div className="multi-split">
      {React.Children.map(children, (child, index) => {
        const typedChild = child as React.ReactElement<
          React.PropsWithChildren<MultiSplitPaneProps>
        >;
        const isOnlyExpanded = expansion.every((e, i) => e === (i === index ? true : false));
        const paneProps = {
          setCollapsed: (isCollapsed: boolean) => handleToggleExpansion(index, !isCollapsed),
          isCollapsed: !expansion[index],
          className: `${expansion[index] ? 'expanded' : ''} ${
            lastExpandedPanelIndex === index ? 'last-expanded' : ''
          } ${isOnlyExpanded ? 'only-expanded' : ''}`,
        };
        return (
          <React.Fragment key={`split-pane-${typedChild?.key || typedChild?.props?.id || index}`}>
            {React.cloneElement(typedChild, paneProps)}
          </React.Fragment>
        );
      }) || null}
    </div>
  );
};

export default MultiSplit;
