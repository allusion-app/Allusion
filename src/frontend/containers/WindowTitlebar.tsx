import { observer } from 'mobx-react-lite';
import React, { useEffect, useState } from 'react';
import { WindowSystemButtonPress } from 'src/ipc/messages';
import { RendererMessenger } from 'src/ipc/renderer';
import { IconSet } from 'widgets/Icons';
import { useStore } from '../contexts/StoreContext';
import { IS_MAC } from 'common/process';

const WindowsTitlebar = () => {
  const [isFocused, setIsFocused] = useState(true);
  useEffect(() => {
    RendererMessenger.onFocus(() => setIsFocused(true));
    RendererMessenger.onBlur(() => setIsFocused(false));
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

  const { uiStore } = useStore();

  /* Extra span needed for ellipsis; isn't compatible with display: flex */
  return (
    <span>
      <span>{uiStore.windowTitle}</span>
    </span>
  );
});

export default WindowsTitlebar;

const WindowSystemButtons = () => {
  const [isMaximized, setMaximized] = useState(RendererMessenger.isMaximized());
  useEffect(() => {
    const onMaximize = () => setMaximized(true);
    const onUnmaximize = () => setMaximized(false);
    RendererMessenger.onUnmaximize(onUnmaximize);
    RendererMessenger.onMaximize(onMaximize);
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
