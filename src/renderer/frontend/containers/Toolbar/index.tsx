import React, { useContext, useCallback, useEffect, useState } from 'react';
import { Button, ButtonGroup } from '@blueprintjs/core';
import { observer } from 'mobx-react-lite';

import StoreContext from '../../contexts/StoreContext';
import IconSet from 'components/Icons';
import { Toolbar as Commandbar, ToolbarToggleButton, ToolbarGroup } from 'components';
import ContentToolbar from './ContentToolbar';
import { remote } from 'electron';

// Tooltip info
export const enum ToolbarTooltips {
  Add = 'Toggle Add Panel',
  Outliner = 'Toggle Outliner',
  Search = 'Toggle Search Panel',
  Media = 'Number of files in library',
  Select = 'Selects or deselects all images',
  TagFiles = 'Quick add or delete tags to selection',
  Delete = 'Delete selected missing images from library',
  View = 'Change view content panel',
  ViewGrid = 'Change view to Grid',
  ViewList = 'Change view List',
  Filter = 'Filter view content panel',
  Inspector = 'Toggle Inspector',
  Settings = 'Toggle Settings',
  HelpCenter = 'Toggle Help Center',
  Back = 'Back to Content panel',
  Preview = 'Open selected images in a preview window',
}

const OutlinerToolbar = observer(() => {
  const { uiStore } = useContext(StoreContext);
  return (
    <ToolbarGroup id="outliner-toolbar">
      <ToolbarToggleButton
        icon={IconSet.OUTLINER}
        onClick={uiStore.toggleOutliner}
        pressed={uiStore.isOutlinerOpen}
        label="Outliner"
        tooltip={ToolbarTooltips.Outliner}
      />
    </ToolbarGroup>
  );
});

const InspectorToolbar = observer(() => {
  const { uiStore } = useContext(StoreContext);
  return (
    <ToolbarGroup id="inspector-toolbar">
      <ToolbarToggleButton
        icon={IconSet.INFO}
        onClick={uiStore.toggleInspector}
        pressed={uiStore.isInspectorOpen}
        label="Inspector"
        tooltip={ToolbarTooltips.Inspector}
      />
      <ToolbarToggleButton
        icon={IconSet.HELPCENTER}
        onClick={uiStore.toggleHelpCenter}
        pressed={uiStore.isHelpCenterOpen}
        label="Help Center"
        tooltip={ToolbarTooltips.HelpCenter}
      />
      <ToolbarToggleButton
        icon={IconSet.SETTINGS}
        onClick={uiStore.toggleSettings}
        pressed={uiStore.isSettingsOpen}
        label="Settings"
        tooltip={ToolbarTooltips.Settings}
      />
    </ToolbarGroup>
  );
});

const WindowsButtonCodes = {
  Minimize: <>&#xE921;</>,
  Maximize: <>&#xE922;</>,
  Restore: <>&#xE923;</>,
  Close: <>&#xE8BB;</>,
};

const WindowsSystemButtons = ({ isMaximized }: { isMaximized: boolean }) => {
  const handleMinimize = useCallback(() => remote.getCurrentWindow().minimize(), []);
  const handleMaximize = useCallback(
    () =>
      isMaximized ? remote.getCurrentWindow().restore() : remote.getCurrentWindow().maximize(),
    [isMaximized],
  );
  const handleClose = useCallback(() => remote.getCurrentWindow().close(), []);
  return (
    <ButtonGroup id="window-system-buttons" minimal>
      <Button className="minimize" text={WindowsButtonCodes.Minimize} onClick={handleMinimize} />
      <Button
        className="maximize"
        text={isMaximized ? WindowsButtonCodes.Restore : WindowsButtonCodes.Maximize}
        onClick={handleMaximize}
      />
      <Button className="close" text={WindowsButtonCodes.Close} onClick={handleClose} />
    </ButtonGroup>
  );
};

const WindowDecoration = ({ isMac }: { isMac: boolean }) => {
  const [isMaximized, setMaximized] = useState(remote.getCurrentWindow().isMaximized());
  useEffect(() => {
    remote.getCurrentWindow().on('maximize', () => setMaximized(true));
    remote.getCurrentWindow().on('unmaximize', () => setMaximized(false));
  }, []);

  return (
    <>
      {/* Invisible region for dragging/resizing the window at the top */}
      {!isMaximized && <div id="window-resize-area" />}

      {!isMac && <WindowsSystemButtons isMaximized={isMaximized} />}
    </>
  );
};

const Toolbar = observer(({ isMac }: { isMac: boolean }) => {
  const { uiStore } = useContext(StoreContext);

  return (
    <Commandbar
      id="toolbar"
      className={isMac ? 'mac-toolbar' : 'windows-toolbar'}
      label="App Command Bar"
      controls="layout-container"
    >
      <OutlinerToolbar />

      {!uiStore.isToolbarVertical && <ContentToolbar />}

      <InspectorToolbar />

      <WindowDecoration isMac={isMac} />
    </Commandbar>
  );
});

export default Toolbar;
