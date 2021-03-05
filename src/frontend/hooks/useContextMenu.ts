import React, { useRef, useState } from 'react';

type Menu = JSX.Element | React.ReactFragment;

interface IContextMenuConfig {
  /** Replaces the menu with the initial menu every time the context menu is
   * closed. This is important in cases the menu references a removed object.
   * @default true
   * */
  resetOnClose?: boolean;
  /** The menu that is rendered on mount and also used as replacement if
   * 'resetOnClose' is true.
   * @default React.ReactFragment
   */
  initialMenu?: Menu;
}

interface IContextMenuState {
  open: boolean;
  x: number;
  y: number;
  menu: Menu;
}

interface IContextMenuMethods {
  show: (x: number, y: number, menu: JSX.Element | JSX.Element[]) => void;
  hide: () => void;
}

export default function useContextMenu(
  options?: IContextMenuConfig,
): [IContextMenuState, IContextMenuMethods] {
  const config = useRef({
    resetOnClose: options?.resetOnClose ?? true,
    initialMenu: options?.initialMenu ?? {},
  });
  const [state, dispatch] = useState({
    open: false,
    x: 0,
    y: 0,
    menu: config.current.initialMenu,
  });

  // This is safe to do because React guarantees that the dispatch function's
  // identity will stay the same across renders.
  const contextMenuMethods = useRef({
    show: (x: number, y: number, menu: JSX.Element | JSX.Element[]) => {
      dispatch({ open: true, menu, x, y });
    },
    hide: () => {
      if (config.current.resetOnClose) {
        dispatch((state) => ({ ...state, menu: config.current.initialMenu, open: false }));
      } else {
        dispatch((state) => ({ ...state, open: false }));
      }
    },
  });

  return [state, contextMenuMethods.current];
}
