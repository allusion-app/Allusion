import React, { useContext, useCallback } from 'react';
import { Button, Popover, MenuItem, Menu, Drawer, Switch } from '@blueprintjs/core';
import { observer } from 'mobx-react-lite';

import StoreContext from '../contexts/StoreContext';

const Toolbar = () => {
  const { uiStore, fileStore } = useContext(StoreContext);

  const handleOutlinerLocations = useCallback(() => { uiStore.outlinerPage = 'LOCATIONS'; }, []);
  const handleOutlinerTags = useCallback(() => { uiStore.outlinerPage = 'TAGS'; }, []);
  const handleOutlinerSearch = useCallback(() => { uiStore.outlinerPage = 'SEARCH'; }, []);

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

  const olPage = uiStore.outlinerPage;

  return (
    <>
      <div className="toolbar" id="outliner-toolbar">
        <Button icon="menu" onClick={handleOutlinerLocations} intent={olPage === 'LOCATIONS' ? 'primary' : 'none'} />
        <Button icon="tag" onClick={handleOutlinerTags} intent={olPage === 'TAGS' ? 'primary' : 'none'} />
        <Button icon="search" onClick={handleOutlinerSearch} intent={olPage === 'SEARCH' ? 'primary' : 'none'} />
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
