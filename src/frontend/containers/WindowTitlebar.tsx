import { observer } from 'mobx-react-lite';
import React, { useEffect, useState } from 'react';
import { RendererMessenger, WindowSystemButtonPress } from 'src/Messaging';
import { IconSet } from 'widgets/Icons';
import { useStore } from '../contexts/StoreContext';

const PLATFORM = process.platform;

const WindowsTitlebar = observer(() => {
  const { uiStore } = useStore();

  const [isFocused, setIsFocused] = useState(true);
  useEffect(() => {
    RendererMessenger.onFocus(() => setIsFocused(true));
    RendererMessenger.onBlur(() => setIsFocused(false));
  }, []);

  return (
    <div id="window-titlebar" className={isFocused ? undefined : 'inactive'}>
      <div id="window-resize-area" />

      {/* Extra span needed for ellipsis; isn't compatible with display: flex */}
      <span>
        <span>{uiStore.windowTitle}</span>
      </span>

      {PLATFORM !== 'darwin' && <WindowSystemButtons />}
    </div>
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
