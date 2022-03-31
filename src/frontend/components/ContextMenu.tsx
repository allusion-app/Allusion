import React, { useContext, useRef, useState } from 'react';
import { ContextMenu, MenuProps } from 'widgets/menus';

type ContextMenuActions = (x: number, y: number, menu: React.ReactElement<MenuProps>) => void;

// eslint-disable-next-line @typescript-eslint/no-empty-function
const ContextMenuContext = React.createContext<ContextMenuActions>(() => {});

const ContextMenuProvider = ContextMenuContext.Provider;

export const ContextMenuLayer = ({ children }: { children: React.ReactNode }) => {
  const [state, setState] = useState({ isOpen: false, x: 0, y: 0, menu: {} });
  const { show, hide } = useRef({
    show: (x: number, y: number, menu: React.ReactElement<MenuProps>) => {
      setState({ isOpen: true, x, y, menu });
    },
    hide: () => {
      setState({ isOpen: false, x: 0, y: 0, menu: {} });
    },
  }).current;

  return (
    <>
      <ContextMenuProvider value={show}>{children}</ContextMenuProvider>
      <ContextMenu isOpen={state.isOpen} x={state.x} y={state.y} close={hide}>
        {state.menu}
      </ContextMenu>
    </>
  );
};

export const useContextMenu = () => {
  return useContext(ContextMenuContext);
};
