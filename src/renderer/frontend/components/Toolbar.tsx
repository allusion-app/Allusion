import React, { useContext, useCallback, useMemo } from 'react';
import {
  Button, Popover, MenuItem, Menu, Drawer, Switch, ButtonGroup, Icon, Divider, Classes, H5,
} from '@blueprintjs/core';
import { observer } from 'mobx-react-lite';

import StoreContext from '../contexts/StoreContext';

const RemoveFilesPopover = ({ onRemove, disabled }: { onRemove: () => void, disabled: boolean }) => (
  <Popover>
    <Button icon="trash" disabled={disabled} />
    <div className="popoverContent">
      <H5>Confirm deletion</H5>
      <p>Are you sure you want to remove these images from your library?</p>
      <p>Your files will not be deleted.</p>

      <div
        style={{
          display: 'flex',
          justifyContent: 'flex-end',
          marginTop: 15,
        }}>
        <Button
          className={Classes.POPOVER_DISMISS}
          style={{ marginRight: 10 }}>
          Cancel
        </Button>
        <Button
          intent="danger"
          className={Classes.POPOVER_DISMISS}
          onClick={onRemove}>
          Delete
        </Button>
      </div>
    </div>
  </Popover>
);

const Toolbar = () => {
  const { uiStore, fileStore } = useContext(StoreContext);

  // Outliner actions
  const handleOutlinerImport = useCallback(() => { uiStore.outlinerPage = 'IMPORT'; }, []);
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

  const handleRemoveSelectedFiles = useCallback(
    async () => {
      await fileStore.removeFilesById(uiStore.fileSelection);
      uiStore.fileSelection.clear();
    },
    [],
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

  const selectionModeOn = uiStore.fileSelection.length > 0;
  const olPage = uiStore.outlinerPage;

  return (
    <div id="toolbar">
      <section id="outliner-toolbar">
        <ButtonGroup minimal>
          <Button icon="add" onClick={handleOutlinerImport} intent={olPage === 'IMPORT' ? 'primary' : 'none'} />
          <Button icon="tag" onClick={handleOutlinerTags} intent={olPage === 'TAGS' ? 'primary' : 'none'} />
          <Button icon="search" onClick={handleOutlinerSearch} intent={olPage === 'SEARCH' ? 'primary' : 'none'} />
        </ButtonGroup>
      </section>

      <section id="main-toolbar">
        <ButtonGroup minimal>
          {/* Library info. Todo: Show entire library count instead of current fileList */}
          <Button icon="folder-open" minimal>Library ({fileStore.fileList.length} items)</Button>

          <Divider />

          {/* Selection info and actions */}
          <Button
            icon={isFileListSelected ? 'tick' : 'circle'}
            onClick={handleToggleSelect}
            intent={isFileListSelected ? 'primary' : 'none'}
          >
            {uiStore.fileSelection.length} selected
          </Button>
          {/* Todo: Show popover for modifying tags of selection (same as inspector?) */}
          <Button
            icon="tag"
            disabled={!selectionModeOn}
          />
          <RemoveFilesPopover onRemove={handleRemoveSelectedFiles} disabled={!selectionModeOn} />

          <Divider />

          {/* Gallery actions */}
          <Popover
            target={<Button icon="layout-grid" />}
            content={layoutMenu}
          />
          <Popover
            target={<Button icon="sort-asc" />}
            content={sortMenu}
          />
        </ButtonGroup>
      </section>

      <section id="inspector-toolbar">
        <ButtonGroup minimal>
          <Button
            icon="info-sign"
            onClick={handleToggleInspector}
            intent={uiStore.isInspectorOpen ? 'primary' : 'none'}
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
        </ButtonGroup>
      </section>
    </div>
  );
};

export default observer(Toolbar);
