import React, { useContext, useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';

import StoreContext from '../../contexts/StoreContext';
import IconSet from 'components/Icons';
import {
  Toolbar as Commandbar,
  ToolbarToggleButton,
  ToolbarGroup,
  ToolbarButton,
} from 'components';
import ContentToolbar from './ContentToolbar';
import { remote } from 'electron';
import { Popover, Menu, MenuItem, KeyCombo } from '@blueprintjs/core';

// Tooltip info
export const enum Tooltip {
  Add = 'Toggle Add Panel',
  Outliner = 'Toggle Outliner',
  Search = 'Toggle Search Panel',
  Media = 'Number of files in library',
  Select = 'Selects or deselects all images',
  TagFiles = 'Quick add or delete tags to selection',
  Delete = 'Delete selected missing images from library',
  View = 'Change view content panel',
  Filter = 'Filter view content panel',
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
        tooltip={Tooltip.Outliner}
      />
    </ToolbarGroup>
  );
});

const InspectorToolbar = observer(() => {
  const { uiStore } = useContext(StoreContext);

  return (
    <ToolbarGroup id="inspector-toolbar">
      <Popover minimal openOnTargetFocus={false}>
        <ToolbarButton showLabel="never" icon={IconSet.MORE} label="More" tooltip="See more" />
        <Menu>
          <MenuItem
            icon={IconSet.INFO}
            onClick={uiStore.toggleInspector}
            active={uiStore.isInspectorOpen}
            text="Inspector"
            labelElement={<KeyCombo minimal combo={uiStore.hotkeyMap.toggleInspector} />}
          />
          <MenuItem
            icon={IconSet.HELPCENTER}
            onClick={uiStore.toggleHelpCenter}
            active={uiStore.isHelpCenterOpen}
            text="Help Center"
            labelElement={<KeyCombo minimal combo={uiStore.hotkeyMap.toggleHelpCenter} />}
          />
          <MenuItem
            icon={IconSet.SETTINGS}
            onClick={uiStore.toggleSettings}
            active={uiStore.isSettingsOpen}
            text="Settings"
            labelElement={<KeyCombo minimal combo={uiStore.hotkeyMap.toggleSettings} />}
          />
        </Menu>
      </Popover>
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
