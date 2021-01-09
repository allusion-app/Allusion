import React, { useEffect, useState } from 'react';
import { RendererMessenger, WindowSystemButtonPress } from 'src/Messaging';

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

// TODO: Replace with icons for linux compatibility or ship font.
const enum WindowsButtonCode {
  Minimize = '\uE921',
  Maximize = '\uE922',
  Restore = '\uE923',
  Close = '\uE8BB',
}

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
        {WindowsButtonCode.Minimize}
      </button>
      <button
        onClick={() =>
          RendererMessenger.pressWindowSystemButton(
            isMaximized ? WindowSystemButtonPress.Restore : WindowSystemButtonPress.Maximize,
          )
        }
      >
        {isMaximized ? WindowsButtonCode.Restore : WindowsButtonCode.Maximize}
      </button>
      <button
        onClick={() => RendererMessenger.pressWindowSystemButton(WindowSystemButtonPress.Close)}
      >
        {WindowsButtonCode.Close}
      </button>
    </div>
  );
};
