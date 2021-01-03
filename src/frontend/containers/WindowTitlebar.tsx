import { remote } from 'electron';
import React, { useEffect, useState } from 'react';

const WindowsTitlebar = () => {
  return (
    <div id="window-titlebar">
      <div id="window-resize-area" />
      <span>Allusion</span>
      <WindowsSystemButtons />
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

const WindowsSystemButtons = () => {
  const win = remote.getCurrentWindow();

  const [isMaximized, setMaximized] = useState(win.isMaximized());
  useEffect(() => {
    const onMaximize = () => setMaximized(true);
    const onUnmaximize = () => setMaximized(false);
    win.addListener('maximize', onMaximize);
    win.addListener('unmaximize', onUnmaximize);
    return () => {
      win.removeListener('maximize', onMaximize);
      win.removeListener('unmaximize', onUnmaximize);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div id="window-system-buttons">
      <button onClick={() => win.minimize()}>{WindowsButtonCode.Minimize}</button>
      <button onClick={() => (isMaximized ? win.restore() : win.maximize())}>
        {isMaximized ? WindowsButtonCode.Restore : WindowsButtonCode.Maximize}
      </button>
      <button onClick={() => win.close()}>{WindowsButtonCode.Close}</button>
    </div>
  );
};
