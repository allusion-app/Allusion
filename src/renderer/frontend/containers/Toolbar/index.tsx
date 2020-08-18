import React, { useContext, useEffect, useState } from 'react';
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
        showLabel="never"
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
    <ToolbarGroup
      showLabel={uiStore.isToolbarVertical ? 'never' : undefined}
      id="inspector-toolbar"
    >
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

const WindowDecoration = () => {
  const [isMaximized, setMaximized] = useState(remote.getCurrentWindow().isMaximized());
  useEffect(() => {
    remote.getCurrentWindow().on('maximize', () => setMaximized(true));
    remote.getCurrentWindow().on('unmaximize', () => setMaximized(false));
  }, []);

  if (!isMaximized) {
    return <div id="window-resize-area" />;
  } else {
    return null;
  }
};

const isMac = process.platform === 'darwin';

const Toolbar = observer(() => {
  const { uiStore } = useContext(StoreContext);

  return (
    <Commandbar
      id="toolbar"
      className={isMac ? 'mac-toolbar' : undefined}
      label="App Command Bar"
      controls="layout-container"
      orientation={uiStore.isToolbarVertical ? 'vertical' : undefined}
    >
      <OutlinerToolbar />

      {!uiStore.isToolbarVertical && <ContentToolbar />}

      <InspectorToolbar />

      {isMac && <WindowDecoration />}
    </Commandbar>
  );
});

export default Toolbar;
