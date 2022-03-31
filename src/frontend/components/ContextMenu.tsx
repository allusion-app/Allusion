import React from 'react';
import { ContextMenu as BaseContextMenu } from 'widgets/menus';
import { ContextMenuProps } from 'widgets/menus/ContextMenu';
import { Portal } from '../hooks/usePortal';

// TODO: Merge with useContextMenu hook.
const ContextMenu = ({ isOpen, x, y, close, children }: ContextMenuProps) => {
  return (
    <Portal id="context-menu-portal">
      <BaseContextMenu isOpen={isOpen} x={x} y={y} close={close}>
        {children}
      </BaseContextMenu>
    </Portal>
  );
};

export default ContextMenu;
