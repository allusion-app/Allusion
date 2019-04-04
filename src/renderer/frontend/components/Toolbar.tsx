import React, { useContext, useCallback } from 'react';
import { Button, Popover, MenuItem, Menu, Drawer, Switch } from '@blueprintjs/core';
import { observer } from 'mobx-react-lite';

import StoreContext from '../contexts/StoreContext';

const Toolbar = () => {
  const { uiStore, fileStore } = useContext(StoreContext);

  const handleToggleOutliner = useCallback(
    () => { uiStore.isOutlinerOpen = !uiStore.isOutlinerOpen; },
    [],
  );

  const handleToggleInspector = useCallback(
    () => { uiStore.isInspectorOpen = !uiStore.isInspectorOpen; },
    [],
  );

  const handleToggleSettings = useCallback(
    () => { uiStore.isSettingsOpen = !uiStore.isSettingsOpen; },
    [],
  );

  const toggleTheme = useCallback(
    () => { uiStore.theme = (uiStore.theme === 'DARK' ? 'LIGHT' : 'DARK'); },
    [],
  );

  const sortMenu = <Menu>
    <MenuItem icon="tag" text="Tag" />
    <MenuItem icon="label" text="Name" />
    <MenuItem icon="document" text="Type" />
    <MenuItem icon="numerical" text="Size" />
    <MenuItem icon="calendar" text="Date" />
  </Menu>;

  return (
    <>
      <div className="toolbar" id="outliner-toolbar">
        <Button
          icon={uiStore.isOutlinerOpen ? 'menu-open' : 'menu-closed'}
          onClick={handleToggleOutliner}
        />
      </div>
      <div className="toolbar" id="main-toolbar">
        <Button icon="folder-open">Library ({fileStore.fileList.length} items)</Button>
        <Button icon="circle" />
        <Button icon="tag" />
        <Button icon="layout-grid" />

        <Popover
          target={<Button icon="sort-asc" />}
          content={sortMenu}
        />

      </div>
      <div className="toolbar" id="inspector-toolbar">
        <Button
          icon="info-sign"
          onClick={handleToggleInspector}
        />
        <Button
          icon="settings"
          onClick={handleToggleSettings}
        />
        <Drawer
          isOpen={uiStore.isSettingsOpen}
          icon="settings"
          onClose={handleToggleSettings}
          title="Settings"
        >
          <Switch checked={uiStore.theme === 'DARK'} onChange={toggleTheme} label="Dark theme" />

          <Button disabled>Clear database</Button>
        </Drawer>

      </div>
    </>
  );
};

export default observer(Toolbar);
