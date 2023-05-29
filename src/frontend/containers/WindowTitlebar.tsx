import { observer } from 'mobx-react-lite';
import React, { useEffect, useState } from 'react';

import { IS_MAC } from 'common/process';
import { WindowSystemButtonPress } from 'src/ipc/messages';
import { RendererMessenger } from 'src/ipc/renderer';
import { IconSet } from 'widgets/icons';
import { useStore } from '../contexts/StoreContext';

const WindowsTitlebar = () => {
  const [isFocused, setIsFocused] = useState(true);
  useEffect(() => {
    const removeFocusHandler = RendererMessenger.onFocus(() => setIsFocused(true));
    const removeBlurHandler = RendererMessenger.onBlur(() => setIsFocused(false));

    return () => {
      removeFocusHandler();
      removeBlurHandler();
    };
  }, []);

  return (
    <div id="window-titlebar" className={isFocused ? undefined : 'inactive'}>
      <div id="window-resize-area" />

      <WindowTitlebar />

      {!IS_MAC && <WindowSystemButtons />}
    </div>
  );
};

const WindowTitlebar = observer(() => {
  // This is its own component to avoid rerendering the whole WindowsTitlebar

  const rootStore = useStore();

  /* Extra span needed for ellipsis; isn't compatible with display: flex */
  return (
    <span>
      <span>{rootStore.getWindowTitle()}</span>
    </span>
  );
});

export default WindowsTitlebar;

const WindowSystemButtons = () => {
  const [isMaximized, setMaximized] = useState(() => RendererMessenger.isMaximized());
  useEffect(() => {
    const removeUnmaximizeHandler = RendererMessenger.onUnmaximize(() => setMaximized(false));
    const removeMaximizeHandler = RendererMessenger.onMaximize(() => setMaximized(true));

    return () => {
      removeUnmaximizeHandler();
      removeMaximizeHandler();
    };
  }, []);

  return (
    <div id="window-system-buttons">
      <button
        onClick={() => RendererMessenger.pressWindowSystemButton(WindowSystemButtonPress.Minimize)}
      >
        {IconSet.CHROME_MINIMIZE}
      </button>
      <button
        onClick={() =>
          RendererMessenger.pressWindowSystemButton(
            isMaximized ? WindowSystemButtonPress.Restore : WindowSystemButtonPress.Maximize,
          )
        }
      >
        {isMaximized ? IconSet.CHROME_RESTORE : IconSet.CHROME_MAXIMIZE}
      </button>
      <button
        onClick={() => RendererMessenger.pressWindowSystemButton(WindowSystemButtonPress.Close)}
      >
        {IconSet.CHROME_CLOSE}
      </button>
    </div>
  );
};
