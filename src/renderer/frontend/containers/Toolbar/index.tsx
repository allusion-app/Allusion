import React, { useContext, useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';

import StoreContext from '../../contexts/StoreContext';
import IconSet from 'components/Icons';
import { Toolbar as Commandbar, ToolbarToggleButton, ToolbarGroup } from 'components';
import ContentToolbar from './ContentToolbar';
import { remote } from 'electron';
import { H4, Icon, H5, Popover, Menu, MenuItem, Divider } from '@blueprintjs/core';

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

const LibraryPicker = () => {
  const { locationStore, tagStore } = useContext(StoreContext);

  const [isOpen, setOpen] = useState(false);

  return (
    <Popover
      minimal
      openOnTargetFocus={false}
      onOpening={() => setOpen(true)}
      onClose={() => setOpen(false)}
      content={
        <Menu>
          <MenuItem
            icon="book"
            // active
            text={
              <div>
                Your library
                <br />
                <span style={{ fontSize: '11px', color: 'grey' }}>
                  Your personal visual library
                </span>
              </div>
            }
            multiline
            labelElement={<Icon icon="tick" />}
          />
          <MenuItem
            icon="folder-shared"
            text={
              <div>
                Library of XYZ
                <br />
                <span style={{ fontSize: '11px', color: 'grey' }}>Read-only</span>
              </div>
            }
            multiline
            labelElement={<Icon icon="notifications" />}
          />
          <Divider />
          <MenuItem text="Create new library" icon="add" />
          <MenuItem text="Import from folder..." icon="import" />
          <MenuItem text="Import from Dropbox..." icon="box" />
          <MenuItem text="Import from Google Drive..." icon="drive-time" />
        </Menu>
      }
    >
      <div style={{ paddingRight: '32px' }}>
        <H5 style={{ marginBottom: '0px', cursor: 'pointer' }}>
          Your library <Icon icon={isOpen ? 'caret-down' : 'caret-right'} />
        </H5>
        <span style={{ fontSize: '11px', color: 'grey' }}>
          {locationStore.locationList.length} Locations, {tagStore.tagList.length} Tags
        </span>
      </div>
    </Popover>
  );
};

const OutlinerToolbar = observer(() => {
  const { uiStore } = useContext(StoreContext);
  return (
    <ToolbarGroup id="outliner-toolbar">
      <LibraryPicker />
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
