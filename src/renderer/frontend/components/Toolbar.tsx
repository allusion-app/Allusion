import React, { useContext, useCallback, useMemo } from 'react';
import {
  Button, Popover, MenuItem, Menu, Icon, Classes, ButtonGroup, Alert,
} from '@blueprintjs/core';
import { observer } from 'mobx-react-lite';

import StoreContext from '../contexts/StoreContext';
import IconSet from './Icons';
import FileTag from './FileTag';
import { ClientFile, IFile } from '../../entities/File';
import UiStore from '../stores/UiStore';

// Tooltip info
const addTooltip = 'Toggle Add panel';
const tagTooltip = 'Toggle Tag panel';
const searchTooltip = 'Toggle Search panel';
const mediaTooltip = 'Number of files using selected tag(s)';
const selectTooltip = 'Selects or deselects all images';
const tagfilesTooltip = 'Quick add or delete tags to selection';
const deleteTooltip = 'Delete selection from library';
const viewTooltip = 'Change view content panel';
const filterTooltip = 'Filter view content panel';
// const fltTagTooltip = 'Filter images by first tag';

interface IRemoveFilesPopoverProps {
  disabled: boolean;
  onRemove: () => void;
  uiStore: UiStore;
}
const RemoveFilesPopover = observer(({ onRemove, disabled, uiStore }: IRemoveFilesPopoverProps) => {
  const handleConfirm = useCallback(() => {
    onRemove();
    uiStore.closeToolbarFileRemover();
  }, []);
  return (
    <>
      <Button
        icon={IconSet.DELETE}
        disabled={disabled}
        onClick={uiStore.toggleToolbarFileRemover}
        className="tooltip"
        data-right={deleteTooltip}
      />
      <Alert
        isOpen={uiStore.isToolbarFileRemoverOpen}
        cancelButtonText="Cancel"
        confirmButtonText="Delete"
        icon={IconSet.DELETE}
        intent="danger"
        onCancel={uiStore.closeToolbarFileRemover}
        onConfirm={handleConfirm}
        canEscapeKeyCancel
        canOutsideClickCancel
        className={Classes.DARK}
      >
        <div className="popoverContent bp3-dark" id="deleteFile">
          <h4 className="bp3-heading inpectorHeading">Confirm delete</h4>
          <p>
            Remove {uiStore.fileSelection.length} image{uiStore.fileSelection.length > 1 ? 's' : ''} from your library?
            <br />
            Your files will not be deleted.
          </p>
        </div>
      </Alert>
    </>
  );
});

interface ITagFilesPopoverProps {
  disabled: boolean;
  files: ClientFile[];
  uiStore: UiStore;
}
const TagFilesPopover = observer(({ disabled, files, uiStore }: ITagFilesPopoverProps) => (
  <Popover minimal isOpen={uiStore.isToolbarTagSelectorOpen} onClose={uiStore.closeToolbarTagSelector}>
    <Button
      icon={IconSet.TAG}
      disabled={disabled}
      onClick={uiStore.toggleToolbarTagSelector}
      className="tooltip"
      data-right={tagfilesTooltip}
    />
    <div className="popoverContent">
      <FileTag files={files} autoFocus />
    </div>
  </Popover>
));

const sortMenuData: Array<{ prop: keyof IFile, icon: JSX.Element, text: string }> = [
  // { prop: 'tags', icon: IconSet.TAG, text: 'Tag' },
  { prop: 'name', icon: IconSet.FILTER_NAME_UP, text: 'Name' },
  { prop: 'extension', icon: IconSet.FILTER_FILE_TYPE, text: 'File type' },
  { prop: 'size', icon: IconSet.FILTER_FILTER_DOWN, text: 'File size' },
  { prop: 'dateAdded', icon: IconSet.FILTER_DATE, text: 'Date added' },
];

const Toolbar = () => {
  const { uiStore, fileStore } = useContext(StoreContext);

  // Outliner actions
  const handleChooseOutlinerPage = useCallback((page: typeof uiStore.outlinerPage) => {
    // If it's already open, close it
    uiStore.isOutlinerOpen = uiStore.isOutlinerOpen
      ? uiStore.outlinerPage !== page
      : uiStore.outlinerPage === page;
    if (page === 'IMPORT') {
      uiStore.openOutlinerImport();
    } else if (page === 'TAGS') {
      uiStore.openOutlinerTags();
    } else if (page === 'SEARCH') {
      uiStore.openOutlinerSearch();
    }
  }, []);
  const handleOlImport = useCallback(() => handleChooseOutlinerPage('IMPORT'), []);
  const handleOlTags = useCallback(() => handleChooseOutlinerPage('TAGS'), []);
  const handleOlSearch = useCallback(() => handleChooseOutlinerPage('SEARCH'), []);

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
    () => fileStore.removeFilesById(uiStore.fileSelection),
    [],
  );

  const viewList = useCallback(() => { uiStore.viewMethod = 'list'; }, []);
  const viewGrid = useCallback(() => { uiStore.viewMethod = 'grid'; }, []);
  const viewMason = useCallback(() => { uiStore.viewMethod = 'mason'; }, []);
  const viewSlide = useCallback(() => { uiStore.viewMethod = 'slide'; }, []);

  // Render variables
  const sortMenu = useMemo(
    () => {
      const orderIcon = (
        <Icon icon={uiStore.fileOrderDescending ? IconSet.ARROW_DOWN : IconSet.ARROW_UP} />
      );
      return (
        <Menu>
          {sortMenuData.map(({ prop, icon, text }) => (
            <MenuItem
              key={prop}
              icon={icon}
              text={text}
              active={uiStore.fileOrder === prop}
              labelElement={uiStore.fileOrder === prop && orderIcon}
              onClick={() => uiStore.fileOrder === prop
                ? uiStore.setFileOrderDescending(!uiStore.fileOrderDescending)
                : uiStore.setFileOrder(prop)}
            />
          ))}
        </Menu>
      );
    },
    [uiStore.fileOrder, uiStore.fileOrderDescending],
  );

  const viewSmall = useCallback(() => { uiStore.thumbnailSize = 'small'; }, []);
  const viewMedium = useCallback(() => { uiStore.thumbnailSize = 'medium'; }, []);
  const viewLarge = useCallback(() => { uiStore.thumbnailSize = 'large'; }, []);

  const layoutMenu = useMemo(() =>
    <Menu>
      <MenuItem
        onClick={viewList}
        icon={IconSet.VIEW_LIST}
        text="List"
        active={uiStore.viewMethod === 'list'}
      />
      <MenuItem
        onClick={viewGrid}
        icon={IconSet.VIEW_GRID}
        text="Grid"
        active={uiStore.viewMethod === 'grid'}
        popoverProps={{ openOnTargetFocus: false }}
      >
         <MenuItem
          onClick={viewSmall}
          icon={IconSet.VIEW_GRID}
          text="Small"
          active={uiStore.thumbnailSize === 'small'}
        />
        <MenuItem
          onClick={viewMedium}
          icon={IconSet.VIEW_GRID}
          text="Medium"
          active={uiStore.thumbnailSize === 'medium'}
        />
        <MenuItem
          onClick={viewLarge}
          icon={IconSet.VIEW_GRID}
          text="Large"
          active={uiStore.thumbnailSize === 'large'}
        />
      </MenuItem>
      <MenuItem
        onClick={viewMason}
        icon={IconSet.VIEW_MASON}
        text="Masonry"
        active={uiStore.viewMethod === 'mason'}
      />
      <MenuItem
        onClick={viewSlide}
        icon={IconSet.VIEW_PRESENT}
        text="Slide"
        active={uiStore.viewMethod === 'slide'}
      />
    </Menu>,
    [uiStore.viewMethod, uiStore.thumbnailSize],
  );

  const numFiles = fileStore.fileList.length;
  const selectionModeOn = uiStore.fileSelection.length > 0 && numFiles > 0;
  const olPage = uiStore.outlinerPage;

  return (
    <div id="toolbar">
      <section id="outliner-toolbar">
        <ButtonGroup minimal>
          <Button
            icon={IconSet.ADD}
            onClick={handleOlImport}
            intent={olPage === 'IMPORT' ? 'primary' : 'none'}
            className="tooltip"
            data-right={addTooltip}
          />
          <Button
            icon={IconSet.TAG}
            onClick={handleOlTags}
            intent={olPage === 'TAGS' ? 'primary' : 'none'} className="tooltip"
            data-right={tagTooltip}
          />
          <Button
            icon={IconSet.SEARCH}
            onClick={handleOlSearch}
            intent={olPage === 'SEARCH' ? 'primary' : 'none'} className="tooltip"
            data-right={searchTooltip}
          />
        </ButtonGroup>
      </section>

      <section id="main-toolbar">
        {/* Library info. Todo: Show entire library count instead of current fileList */}
        <Button id="media" icon={IconSet.MEDIA} minimal className="tooltip" data-right={mediaTooltip}>
          {numFiles} item{`${numFiles === 1 ? '' : 's'}`}
        </Button>

        <ButtonGroup minimal>

          {/* Selection info and actions */}
          <Button
            rightIcon={isFileListSelected ? IconSet.SELECT_ALL_CHECKED : IconSet.SELECT_ALL}
            onClick={handleToggleSelect}
            intent={isFileListSelected ? 'primary' : 'none'}
            className="tooltip"
            data-right={selectTooltip}
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
            uiStore={uiStore}
            // hasBackdrop={false}
          />

          {/* Gallery actions */}
          <Popover minimal
            target={<Button icon={IconSet.VIEW_GRID} className="tooltip" data-right={viewTooltip} />}
            content={layoutMenu}
          />
          <Popover minimal
            target={<Button icon={IconSet.FILTER} className="tooltip" data-right={filterTooltip} />}
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
            className="tooltip" data-left={'Toggle inspector'}
          />
          <Button
            icon={IconSet.SETTINGS}
            onClick={uiStore.toggleSettings}
            className="tooltip" data-left={'Toggle settings'}
          />
        </ButtonGroup>
      </section>
    </div>
  );
};

export default observer(Toolbar);
