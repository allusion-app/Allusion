import React, { useContext, useCallback, useMemo } from 'react';
import {
  Button,
  Popover,
  MenuItem,
  Menu,
  Icon,
  Classes,
  ButtonGroup,
  Alert,
} from '@blueprintjs/core';
import { observer } from 'mobx-react-lite';

import StoreContext from '../../contexts/StoreContext';
import IconSet from '../../components/Icons';
import FileTag from '../../components/FileTag';
import { ClientFile, IFile } from '../../../entities/File';
import UiStore from '../../UiStore';

// Tooltip info
const enum Tooltip {
  Add = 'Toggle Add Panel',
  Tag = 'Toggle Tag Panel',
  Search = 'Toggle Search Panel',
  Media = 'Number of files using selected tag(s)',
  Select = 'Selects or deselects all images',
  TagFiles = 'Quick add or delete tags to selection',
  Delete = 'Delete selection from library',
  View = 'Change view content panel',
  ViewGrid = 'Change view to Grid',
  ViewList = 'Change view List',
  Filter = 'Filter view content panel',
  Inspector = 'Toggle Inspector',
  Settings = 'Toggle Settings',
  Back = 'Back to Content panel',
  // FilterTag = 'Filter images by first tag',
}

interface IRemoveFilesPopoverProps {
  disabled: boolean;
  onRemove: () => void;
  uiStore: UiStore;
}

export const RemoveFilesPopover = observer(({ onRemove, disabled, uiStore }: IRemoveFilesPopoverProps) => {
  const handleConfirm = useCallback(() => {
    onRemove();
    uiStore.closeToolbarFileRemover();
  }, [onRemove, uiStore]);
  return (
    <>
      <Button
        icon={IconSet.DELETE}
        disabled={disabled}
        onClick={uiStore.toggleToolbarFileRemover}
        className="tooltip"
        data-right={Tooltip.Delete}
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
        <div className="bp3-dark" id="deleteFile">
          {' '}
          {/*popoverContent*/}
          <h4 className="bp3-heading inpectorHeading">Confirm delete</h4>
          <p>
            Remove {uiStore.fileSelection.length} image{uiStore.fileSelection.length > 1 ? 's' : ''}{' '}
            from your library?
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
  <Popover
    minimal
    isOpen={uiStore.isToolbarTagSelectorOpen}
    onClose={uiStore.closeToolbarTagSelector}
  >
    <Button
      icon={IconSet.TAG}
      disabled={disabled}
      onClick={uiStore.toggleToolbarTagSelector}
      className="tooltip"
      data-right={Tooltip.TagFiles}
    />
    <div className="popoverContent">
      <FileTag files={files} autoFocus />
    </div>
  </Popover>
));

const sortMenuData: Array<{ prop: keyof IFile; icon: JSX.Element; text: string }> = [
  // { prop: 'tags', icon: IconSet.TAG, text: 'Tag' },
  { prop: 'name', icon: IconSet.FILTER_NAME_UP, text: 'Name' },
  { prop: 'extension', icon: IconSet.FILTER_FILE_TYPE, text: 'File type' },
  { prop: 'size', icon: IconSet.FILTER_FILTER_DOWN, text: 'File size' },
  { prop: 'dateAdded', icon: IconSet.FILTER_DATE, text: 'Date added' },
];

const Toolbar = observer(() => {
  const { uiStore, fileStore } = useContext(StoreContext);

  // Outliner actions
  const handleChooseOutlinerPage = useCallback(
    (page: typeof uiStore.outlinerPage) => {
      if (uiStore.outlinerPage === page) {
        uiStore.toggleOutliner();
      }

    if (page === 'IMPORT') {
      uiStore.openOutlinerImport();
    } else if (page === 'TAGS') {
      uiStore.openOutlinerTags();
    }
  }, [uiStore]);
  const handleOlTags = useCallback(() => handleChooseOutlinerPage('TAGS'), [handleChooseOutlinerPage]);
  const handleOlSearch = uiStore.toggleQuickSearch;

  // Content actions
  const isFileListSelected =
    uiStore.fileSelection.length > 0 && uiStore.fileSelection.length === fileStore.fileList.length;
  // If everything is selected, deselect all. Else, select all
  const handleToggleSelect = useCallback(
    () =>
      isFileListSelected
        ? uiStore.clearFileSelection()
        : uiStore.selectFiles(
            fileStore.fileList.map((f) => f.id).filter((f) => !uiStore.fileSelection.includes(f)),
          ),
    [fileStore.fileList, isFileListSelected, uiStore],
  );

  // const handleRemoveSelectedFiles = useCallback(
  //   () => fileStore.removeFilesById(uiStore.fileSelection),
  //   [fileStore, uiStore.fileSelection],
  // );

  // Render variables
  const sortMenu = useMemo(() => {
    const orderIcon = (
      <Icon icon={uiStore.view.fileOrder === 'DESC' ? IconSet.ARROW_DOWN : IconSet.ARROW_UP} />
    );
    return (
      <Menu>
        {sortMenuData.map(({ prop, icon, text }) => (
          <MenuItem
            key={prop}
            icon={icon}
            text={text}
            active={uiStore.view.orderBy === prop}
            labelElement={uiStore.view.orderBy === prop && orderIcon}
            onClick={() =>
              uiStore.view.orderBy === prop ? uiStore.switchFileOrder() : uiStore.orderFilesBy(prop)
            }
          />
        ))}
      </Menu>
    );
  }, [uiStore.view.orderFilesBy, uiStore.view.orderBy, uiStore.view.fileOrder]); //eslint-disable-line

  const numFiles = fileStore.fileList.length;
  const selectionModeOn = uiStore.fileSelection.length > 0 && numFiles > 0;
  const olPage = uiStore.outlinerPage;

  return (
    <div id="toolbar">
      <section id="outliner-toolbar">
        <ButtonGroup minimal>
          <Button
            icon={IconSet.TAG}
            onClick={handleOlTags}
            intent={olPage === 'TAGS' && uiStore.isOutlinerOpen ? 'primary' : 'none'}
            className="tooltip"
            data-right={Tooltip.Tag}
          />
          <Button
            icon={IconSet.SEARCH}
            onClick={handleOlSearch}
            intent={uiStore.isQuickSearchOpen ? 'primary' : 'none'}
            className="tooltip"
            data-right={Tooltip.Search}
          />
        </ButtonGroup>
      </section>

      <section id="main-toolbar">
        <ButtonGroup minimal>
          {/* Disable slide mode */}
          {uiStore.view.isSlideMode && (
            <Button
              icon={IconSet.ARROW_LEFT}
              onClick={uiStore.view.disableSlideMode}
              intent="primary"
              className="tooltip"
              data-right={Tooltip.Back}
            >Return</Button>
          )}

          {/* Library info. Todo: Show entire library count instead of current fileList */}
          {!uiStore.view.isSlideMode && (
          <Button id="media" icon={IconSet.MEDIA} className="tooltip" data-right={Tooltip.Media}>
            {numFiles} item{`${numFiles === 1 ? '' : 's'}`}
          </Button>
          )}
        </ButtonGroup>

        {!uiStore.view.isSlideMode && (    
        <ButtonGroup minimal>
          {/* Selection info and actions */}
          <Button
            rightIcon={isFileListSelected ? IconSet.SELECT_ALL_CHECKED : IconSet.SELECT_ALL}
            onClick={handleToggleSelect}
            intent={isFileListSelected ? 'primary' : 'none'}
            className="tooltip"
            data-right={Tooltip.Select}
          >
            {uiStore.fileSelection.length} selected
          </Button>
          {/* Show popover for modifying tags of selection (same as inspector) */}
          <TagFilesPopover
            files={uiStore.clientFileSelection}
            disabled={!selectionModeOn}
            uiStore={uiStore}
          />
          {/* <RemoveFilesPopover
            onRemove={handleRemoveSelectedFiles}
            disabled={!selectionModeOn}
            uiStore={uiStore}
          /> */}

          <Popover
            minimal
            target={
              <Button icon={IconSet.FILTER} className="tooltip" data-right={Tooltip.Filter} />
            }
            content={sortMenu}
          />
        </ButtonGroup>
        )}

        {!uiStore.view.isSlideMode && (    
        <ButtonGroup minimal>
          <Button
            onClick={uiStore.view.setMethodList}
            icon={IconSet.VIEW_LIST}
            active={uiStore.view.isList}
            className="tooltip"
            data-right={Tooltip.ViewList}
          />
          <Button
            onClick={uiStore.view.setMethodGrid}
            icon={IconSet.VIEW_GRID}
            active={uiStore.view.isGrid}
            className="tooltip"
            data-right={Tooltip.ViewGrid}
          />
          <div id="spacer" style={{ width: '1rem' }} />
        </ButtonGroup>
        )}
      </section>

      <section id="inspector-toolbar">
        <ButtonGroup minimal>
          <Button
            icon={IconSet.INFO}
            onClick={uiStore.toggleInspector}
            intent={uiStore.isInspectorOpen ? 'primary' : 'none'}
            className="tooltip"
            data-left={Tooltip.Inspector}
          />
          <Button
            icon={IconSet.SETTINGS}
            onClick={uiStore.toggleSettings}
            className="tooltip"
            data-left={Tooltip.Settings}
          />
        </ButtonGroup>
      </section>
    </div>
  );
});

export default Toolbar;
