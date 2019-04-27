import { remote } from 'electron';
import React, { useContext, useCallback, useMemo } from 'react';
import {
  Button, Popover, MenuItem, Menu, Drawer, Switch, ButtonGroup, Icon, Divider, Classes, H5, Callout,
} from '@blueprintjs/core';
import { observer } from 'mobx-react-lite';

import StoreContext from '../contexts/StoreContext';
import IconSet from './Icons';
import FileTag from './FileTag';
import { ClientFile } from '../../entities/File';
import UiStore from '../stores/UiStore';

const RemoveFilesPopover = ({ onRemove, disabled }: { onRemove: () => void, disabled: boolean }) => (
  <Popover>
    <Button icon={IconSet.DELETE} disabled={disabled} />
    <div className="popoverContent">
      <H5 className="inpectorHeading">Confirm deletion</H5>
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

interface ITagFilesPopoverProps {
  disabled: boolean;
  files: ClientFile[];
  uiStore: UiStore;
}
const TagFilesPopover = observer(({ disabled, files, uiStore }: ITagFilesPopoverProps) => (
  <Popover minimal isOpen={uiStore.isToolbarTagSelectorOpen} onClose={uiStore.closeToolbarTagSelector}>
    <Button icon={IconSet.TAG} disabled={disabled} onClick={uiStore.toggleToolbarTagSelector} />
    <div className="popoverContent">
      <FileTag files={files} autoFocus />
    </div>
  </Popover>
));

const Toolbar = () => {
  const { uiStore, fileStore } = useContext(StoreContext);

  // Outliner actions
  const handleToggleOutliner = useCallback(
    () => { uiStore.isOutlinerOpen = !uiStore.isOutlinerOpen; },
    [],
  );
  const handleOlImport = useCallback(() => { uiStore.outlinerPage = 'IMPORT'; }, []);
  const handleOlTags = useCallback(() => { uiStore.outlinerPage = 'TAGS'; }, []);
  const handleOlSearch = useCallback(() => { uiStore.outlinerPage = 'SEARCH'; }, []);

  // Content actions
  const isFileListSelected = uiStore.fileSelection.length > 0
    && uiStore.fileSelection.length === fileStore.fileList.length;
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
  const handleFullScreen = useCallback(
    () => {
      // (toggleFullScreen);
      remote.getCurrentWindow().setFullScreen(uiStore.fullscreen);
    },
    [],
  );
  const toggleFullScreen = useCallback(
    // () => { uiStore.fullscreen = (uiStore.fullscreen === false ? true : false); },
    () => {
      uiStore.fullscreen = !uiStore.fullscreen;
      handleFullScreen();
    },
    [],
  );

  // Render variables
  const sortMenu = useMemo(() =>
    <Menu>
      <MenuItem icon={IconSet.TAG} text="Tag" />
      <MenuItem icon={IconSet.FILTER_NAME_UP} text="Name" />
      <MenuItem icon={IconSet.FILTER_FILE_TYPE} text="Type" />
      <MenuItem icon={IconSet.FILTER_FILTER_DOWN} text="Size" />
      <MenuItem icon={IconSet.FILTER_DATE} text="Date" labelElement={<Icon icon={IconSet.ARROW_UP} />} active />
    </Menu>,
    [],
  );

  const layoutMenu = useMemo(() =>
    <Menu>
      <MenuItem icon={IconSet.VIEW_LIST} text="List" />
      <MenuItem icon={IconSet.VIEW_GRID} text="Grid" active />
      <MenuItem icon={IconSet.VIEW_MASON} text="Masonry" />
      <MenuItem icon={IconSet.VIEW_PRESENT} text="Slide" />
    </Menu>,
    [],
  );

  const numFiles = fileStore.fileList.length;
  const selectionModeOn = uiStore.fileSelection.length > 0 && numFiles > 0;
  const olPage = uiStore.outlinerPage;

  const handleOpenDevtools = useCallback(() => remote.getCurrentWebContents().openDevTools(), []);

  const themeClass = uiStore.theme === 'DARK' ? 'bp3-dark' : 'bp3-light';

  return (
    <div id="toolbar">
      <section id="outliner-toolbar">
        <ButtonGroup minimal>
          <Button icon={IconSet.ADD} onClick={handleOlImport} onDoubleClick={handleToggleOutliner} intent={olPage === 'IMPORT' ? 'primary' : 'none'} />{/* // tslint:disable-next-line */}
          <Button icon={IconSet.TAG} onClick={handleOlTags} onDoubleClick={handleToggleOutliner} intent={olPage === 'TAGS' ? 'primary' : 'none'} />{/* // tslint:disable-next-line */}
          <Button icon={IconSet.SEARCH} onClick={handleOlSearch} onDoubleClick={handleToggleOutliner} intent={olPage === 'SEARCH' ? 'primary' : 'none'} />{/* // tslint:disable-next-line */}
        </ButtonGroup>
      </section>

      <section id="main-toolbar">
        {/* Library info. Todo: Show entire library count instead of current fileList */}
        <Button icon={IconSet.MEDIA} minimal>{numFiles} item{`${numFiles === 1 ? '' : 's'}`}</Button>

        <ButtonGroup minimal>

          {/* <Divider /> */}

          {/* Selection info and actions */}
          <Button
            rightIcon={isFileListSelected ? IconSet.SELECT_ALL_CHECKED : IconSet.SELECT_ALL}
            onClick={handleToggleSelect}
            intent={isFileListSelected ? 'primary' : 'none'}
          >
            {uiStore.fileSelection.length} selected
          </Button>
          {/* Show popover for modifying tags of selection (same as inspector) */}
          <TagFilesPopover
            files={uiStore.clientFileSelection}
            disabled={!selectionModeOn}
            uiStore={uiStore}
          />
          <RemoveFilesPopover onRemove={handleRemoveSelectedFiles} disabled={!selectionModeOn} />

          {/* <Divider /> */}

          {/* Gallery actions */}
          <Popover minimal
            target={<Button icon={IconSet.VIEW_GRID} />}
            content={layoutMenu}
          />
          <Popover minimal
            target={<Button icon={IconSet.FILTER} />}
            content={sortMenu}
          />
        </ButtonGroup>
        <div id="spacer" style={{ width: '100px'}}></div>
      </section>

      <section id="inspector-toolbar">
        <ButtonGroup minimal>
          <Button
            icon={IconSet.INFO}
            onClick={handleToggleInspector}
            intent={uiStore.isInspectorOpen ? 'primary' : 'none'}
          />
          <Button
            icon={IconSet.SETTINGS}
            onClick={handleToggleSettings}
          />
          <Drawer
            isOpen={uiStore.isSettingsOpen}
            icon={IconSet.SETTINGS}
            onClose={handleToggleSettings}
            title="Settings"
            className={themeClass}
          >
            <div className={Classes.DRAWER_BODY}>
              {/* <div className={Classes.DIALOG_BODY}> */}
              <Switch checked={uiStore.fullscreen} onChange={toggleFullScreen} label="Full screen" />
              <Switch checked={uiStore.theme === 'DARK'} onChange={toggleTheme} label="Dark theme" />

              <Divider />

              <Button disabled fill>Clear database</Button>

              <Button onClick={handleOpenDevtools} intent="warning" icon={IconSet.CHROME_DEVTOOLS} fill>
                Open DevTools
                </Button>

              <br />

              <Callout icon={IconSet.INFO}>
                <H5>Tip: Hotkeys</H5>
                <p>
                  Did you know there are hotkeys?<br/>
                  Press <span className={Classes.KEY_COMBO}><span className={Classes.KEY + ' ' + Classes.MODIFIER_KEY}>shift</span>&nbsp;<span className={Classes.KEY}>/</span>&nbsp;to see them.</span>{/* // tslint:disable-next-line */}
                </p>
              </Callout>
              {/* </div> */}
            </div>
          </Drawer>
        </ButtonGroup>
      </section>
    </div>
  );
};

export default observer(Toolbar);
