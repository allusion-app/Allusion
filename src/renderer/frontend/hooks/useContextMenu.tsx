import React, { useReducer, useCallback, useRef } from 'react';

type Menu = JSX.Element | JSX.Element[];

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

enum IActionType {
  Show,
  Hide,
}

interface IActionConfig {
  resetOnClose: boolean;
  initialMenu: Menu;
}

type IAction =
  | (Omit<IContextMenuState, 'open'> & { type: IActionType.Show })
  | { type: IActionType.Hide; config: IActionConfig };

const reducer = (state: any, action: IAction): IContextMenuState => {
  if (action.type === IActionType.Show) {
    return {
      open: true,
      menu: action.menu,
      x: action.x,
      y: action.y,
    };
  } else if (action.config.resetOnClose) {
    return { ...state, menu: action.config.initialMenu, open: false };
  } else {
    return { ...state, open: false };
  }
};

interface IContextMenuMethods {
  show: (x: number, y: number, menu: JSX.Element | JSX.Element[]) => void;
  hide: () => void;
}

export default function useContextMenu(
  options?: IContextMenuConfig,
): [IContextMenuState, IContextMenuMethods] {
  const config = useRef({
    resetOnClose: options?.resetOnClose ?? true,
    initialMenu: options?.initialMenu ?? <></>,
  });
  const [state, dispatch] = useReducer(reducer, {
    open: false,
    x: 0,
    y: 0,
    menu: config.current.initialMenu,
  });
  const show = useCallback(
    (x: number, y: number, menu: JSX.Element | JSX.Element[]) =>
      dispatch({ type: IActionType.Show, x, y, menu }),
    [],
  );
  const hide = useCallback(() => dispatch({ type: IActionType.Hide, config: config.current }), []);

  return [state, { show, hide }];
}
