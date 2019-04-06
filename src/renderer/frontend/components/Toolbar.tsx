import React, { useContext, useCallback, useMemo } from 'react';
import { Button, Popover, MenuItem, Menu, Drawer, Switch, ButtonGroup, Icon } from '@blueprintjs/core';
import { observer } from 'mobx-react-lite';

import StoreContext from '../contexts/StoreContext';

const Toolbar = () => {
  const { uiStore, fileStore } = useContext(StoreContext);

  // Outliner actions
  const handleOutlinerLocations = useCallback(() => { uiStore.outlinerPage = 'LOCATIONS'; }, []);
  const handleOutlinerTags = useCallback(() => { uiStore.outlinerPage = 'TAGS'; }, []);
  const handleOutlinerSearch = useCallback(() => { uiStore.outlinerPage = 'SEARCH'; }, []);

  // Content actions
  const isFileListSelected = uiStore.fileSelection.length === fileStore.fileList.length;
  // If everything is selected, deselect all. Else, select all
  const handleToggleSelect = useCallback(
    () => (isFileListSelected)
      ? uiStore.fileSelection.clear()
      : uiStore.fileSelection.push(
        ...fileStore.fileList
          .map((f) => f.id)
          .filter((f) => !uiStore.fileSelection.includes(f)),
      ),
    [isFileListSelected],
  );

  // Inspector actions
  const handleToggleInspector = useCallback(
    () => { uiStore.isInspectorOpen = !uiStore.isInspectorOpen; },
    [],
  );

  const handleToggleSettings = useCallback(
    () => { uiStore.isSettingsOpen = !uiStore.isSettingsOpen; },
    [],
  );

  // Settings actions
  const toggleTheme = useCallback(
    () => { uiStore.theme = (uiStore.theme === 'DARK' ? 'LIGHT' : 'DARK'); },
    [],
  );

  // Render variables
  const sortMenu = useMemo(() =>
    <Menu>
      <MenuItem icon="tag" text="Tag" />
      <MenuItem icon="label" text="Name" />
      <MenuItem icon="document" text="Type" />
      <MenuItem icon="numerical" text="Size" />
      <MenuItem icon="calendar" text="Date" labelElement={<Icon icon="sort-desc" /> } active />
    </Menu>,
    [],
  );

  const layoutMenu = useMemo(() =>
    <Menu>
      <MenuItem icon="list-detail-view" text="List" />
      <MenuItem icon="layout-grid" text="Grid" active />
      <MenuItem icon="full-stacked-chart" text="Masonry" />
      <MenuItem icon="play" text="Slide" />
    </Menu>,
    [],
  );

  const olPage = uiStore.outlinerPage;

  return (
    <div id="toolbar">
      <section id="outliner-toolbar">
        <ButtonGroup>
          <Button icon="menu" onClick={handleOutlinerLocations} intent={olPage === 'LOCATIONS' ? 'primary' : 'none'} />
          <Button icon="tag" onClick={handleOutlinerTags} intent={olPage === 'TAGS' ? 'primary' : 'none'} />
          <Button icon="search" onClick={handleOutlinerSearch} intent={olPage === 'SEARCH' ? 'primary' : 'none'} />
        </ButtonGroup>
      </section>

      <section id="main-toolbar">
        <Button icon="folder-open">Library ({fileStore.fileList.length} items)</Button>
        <Button
          icon={isFileListSelected ? 'tick' : 'circle'}
          onClick={handleToggleSelect}
          intent={isFileListSelected ? 'primary' : 'none'}
        />
        <Button icon="tag" />
        <Popover
          target={<Button icon="layout-grid" />}
          content={layoutMenu}
        />
        <Popover
          target={<Button icon="sort-asc" />}
          content={sortMenu}
        />
      </section>

      <section id="inspector-toolbar">
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

      </section>
    </div>
  );
};

export default observer(Toolbar);
