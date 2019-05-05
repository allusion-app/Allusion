import React, { useContext, useCallback, useMemo } from 'react';
import {
  Button, Popover, MenuItem, Menu, ButtonGroup, Icon, Classes, H4,
} from '@blueprintjs/core';
import { observer } from 'mobx-react-lite';

import StoreContext from '../contexts/StoreContext';
import IconSet from './Icons';
import FileTag from './FileTag';
import { ClientFile } from '../../entities/File';
import UiStore from '../stores/UiStore';

// Tooltip info
const addTooltip = 'Toggle Add panel';
const tagTooltip = 'Toggle Tag panel';
const searchTooltip = 'Toggle Search panel';
const mediaTooltip = 'Number of files using selected tag(s)';
const selectTooltip = 'Selects or deselcts all images';
const tagfilesTooltip = 'Quick add or delete tags to selection';
const deleteTooltip = 'Delete selection from library';
const viewTooltip = 'Change view content panel';
const filterTooltip = 'Filter view content panel';
const fltTagTooltip = 'Filter images by first tag';

const RemoveFilesPopover = ({ onRemove, disabled }: { onRemove: () => void, disabled: boolean }) => (
  <Popover minimal>
    <Button icon={IconSet.DELETE} disabled={disabled} className={'tooltip'} data-right={deleteTooltip}/>
    <div className="popoverContent" id="deleteFile">
      <h4 className="bp3-heading inpectorHeading">Confirm deletion</h4>
      <p>Remove these images from your library?</p>
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
    <Button icon={IconSet.TAG} disabled={disabled} onClick={uiStore.toggleToolbarTagSelector} className={'tooltip'} data-right={tagfilesTooltip}/>{/* // tslint:disable-next-line */}
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

  const viewList = useCallback(() => { uiStore.viewMethod = 'list'; }, []);
  const viewGrid = useCallback(() => { uiStore.viewMethod = 'grid'; }, []);
  const viewMason = useCallback(() => { uiStore.viewMethod = 'mason'; }, []);
  const viewSlide = useCallback(() => { uiStore.viewMethod = 'slide'; }, []);


  // Render variables
  const sortMenu = useMemo(() =>
    <Menu>
      <MenuItem icon={IconSet.TAG} text="Tag" className={'tooltip'} data-right={fltTagTooltip}/>{/* // tslint:disable-next-line */}
      <MenuItem icon={IconSet.FILTER_NAME_UP} text="Name" />
      <MenuItem icon={IconSet.FILTER_FILE_TYPE} text="Type" />
      <MenuItem icon={IconSet.FILTER_FILTER_DOWN} text="Size" />
      <MenuItem icon={IconSet.FILTER_DATE} text="Date" labelElement={<Icon icon={IconSet.ARROW_UP} />} active />
    </Menu>,
    [],
  );

  const vwMethod = uiStore.viewMethod;
  const layoutMenu = useMemo(() =>
    <Menu>
      <MenuItem onClick={viewList} icon={IconSet.VIEW_LIST} text="list" intent={vwMethod === 'list' ? 'primary' : 'none'}/>{/* // tslint:disable-next-line */}
      <MenuItem onClick={viewGrid} icon={IconSet.VIEW_GRID} text="grid" active intent={vwMethod === 'grid' ? 'primary' : 'none'}/>{/* // tslint:disable-next-line */}
      <MenuItem onClick={viewMason} icon={IconSet.VIEW_MASON} text="Masonry" intent={vwMethod === 'mason' ? 'primary' : 'none'}/>{/* // tslint:disable-next-line */}
      <MenuItem onClick={viewSlide} icon={IconSet.VIEW_PRESENT} text="slide" intent={vwMethod === 'slide' ? 'primary' : 'none'}/>{/* // tslint:disable-next-line */}
    </Menu>,
    [],
  );

  const numFiles = fileStore.fileList.length;
  const selectionModeOn = uiStore.fileSelection.length > 0 && numFiles > 0;
  const olPage = uiStore.outlinerPage;

  return (
    <div id="toolbar">
      <section id="outliner-toolbar">
        <ButtonGroup minimal>
          <Button icon={IconSet.ADD} onClick={handleOlImport} onDoubleClick={handleToggleOutliner} intent={olPage === 'IMPORT' ? 'primary' : 'none'} className={'tooltip'} data-right={addTooltip}/>{/* // tslint:disable-next-line */}
          <Button icon={IconSet.TAG} onClick={handleOlTags} onDoubleClick={handleToggleOutliner} intent={olPage === 'TAGS' ? 'primary' : 'none'} className={'tooltip'} data-right={tagTooltip}/>{/* // tslint:disable-next-line */}
          <Button icon={IconSet.SEARCH} onClick={handleOlSearch} onDoubleClick={handleToggleOutliner} intent={olPage === 'SEARCH' ? 'primary' : 'none'} className={'tooltip'} data-right={searchTooltip}/>{/* // tslint:disable-next-line */}
        </ButtonGroup>
      </section>

      <section id="main-toolbar">
        {/* Library info. Todo: Show entire library count instead of current fileList */}
        <Button id="media" icon={IconSet.MEDIA} minimal className={'tooltip'} data-right={mediaTooltip}>{numFiles} item{`${numFiles === 1 ? '' : 's'}`}</Button>{/* // tslint:disable-next-line */}

        <ButtonGroup minimal>

          {/* Selection info and actions */}
          <Button
            rightIcon={isFileListSelected ? IconSet.SELECT_ALL_CHECKED : IconSet.SELECT_ALL}
            onClick={handleToggleSelect}
            intent={isFileListSelected ? 'primary' : 'none'}
            className={'tooltip'} data-right={selectTooltip}
          >
            {uiStore.fileSelection.length} selected
          </Button>
          {/* Show popover for modifying tags of selection (same as inspector) */}
          <TagFilesPopover
            files={uiStore.clientFileSelection}
            disabled={!selectionModeOn}
            uiStore={uiStore}
          />
          <RemoveFilesPopover
            onRemove={handleRemoveSelectedFiles}
            disabled={!selectionModeOn}
          />

          {/* Gallery actions */}
          <Popover minimal
            target={<Button icon={IconSet.VIEW_GRID} className={'tooltip'} data-right={viewTooltip}/>}
            content={layoutMenu}
          />
          <Popover minimal
            target={<Button icon={IconSet.FILTER} className={'tooltip'} data-right={filterTooltip}/>}
            content={sortMenu}
          />
        </ButtonGroup>
        <div id="spacer" style={{ width: '100px' }}></div>
      </section>

      <section id="inspector-toolbar">
        <ButtonGroup minimal>
          <Button
            icon={IconSet.INFO}
            onClick={uiStore.toggleInspector}
            intent={uiStore.isInspectorOpen ? 'primary' : 'none'}
            className={'tooltip'} data-left={'Toggle inspector'}
          />
          <Button
            icon={IconSet.SETTINGS}
            onClick={handleToggleSettings}
            className={'tooltip'} data-left={'Toggle settings'}
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
                <H4 className={'bp3-heading inspectorHeading'}>Tip: Hotkeys</H4>
                <p>
                  Did you know there are hotkeys?<br />
                  Press&nbsp;<span className={Classes.KEY_COMBO}><span className={Classes.KEY + ' ' + Classes.MODIFIER_KEY}>shift</span>&nbsp;<span className={Classes.KEY}>/</span>&nbsp;to see them.</span>{/* // tslint:disable-next-line */}
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
