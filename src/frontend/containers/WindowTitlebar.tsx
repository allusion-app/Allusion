import React, { useEffect, useState } from 'react';
import { RendererMessenger, WindowSystemButtonPress } from 'src/Messaging';
import { IconSet } from 'widgets/Icons';

const WindowsTitlebar = () => {
  return (
    <div id="window-titlebar">
      <div id="window-resize-area" />
      <span>Allusion</span>
      <WindowSystemButtons />
    </div>
  );
};

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
