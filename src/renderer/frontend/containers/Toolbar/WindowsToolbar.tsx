import { remote } from 'electron';
import React, { useEffect, useState } from 'react';

const WindowsButtonCodes = {
  Minimize: <>&#xE921;</>,
  Maximize: <>&#xE922;</>,
  Restore: <>&#xE923;</>,
  Close: <>&#xE8BB;</>,
};

const WindowsSystemButtons = ({ win, isMaximized }: { win: Electron.BrowserWindow, isMaximized: boolean }) => {

  return (
    <div id="window-system-buttons">
      <span onClick={() => win.minimize()}>{WindowsButtonCodes.Minimize}</span>
      <span onClick={() => isMaximized ? win.restore() : win.maximize()}>{isMaximized ? WindowsButtonCodes.Restore : WindowsButtonCodes.Maximize}</span>
      <span className="close" onClick={() => win.close()}>{WindowsButtonCodes.Close}</span>
    </div>
  );
};

const WindowsToolbar = () => {
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
    <div id="windows-frame-bar">
      {!isMaximized && <div id="window-resize-area" />}
      <span>Allusion</span>
      <WindowsSystemButtons win={win} isMaximized={isMaximized} />
    </div >
  );
}

export default WindowsToolbar;
