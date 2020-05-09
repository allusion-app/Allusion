import React, { useContext, useMemo } from 'react';
import { Button, Popover, MenuItem, Menu, Icon, ButtonGroup } from '@blueprintjs/core';
import { observer } from 'mobx-react-lite';

import StoreContext from '../../contexts/StoreContext';
import IconSet from '../../components/Icons';
import FileTags from '../../components/FileTag';
import { ClientFile, IFile } from '../../../entities/File';
import { ViewMethod } from '../../UiStore';
import { FileOrder } from '../../../backend/DBRepository';

// Tooltip info
const enum Tooltip {
  Add = 'Toggle Add Panel',
  Outliner = 'Toggle Outliner',
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
}

interface IOutlinerToolbar {
  isOutlinerOpen: boolean;
  isQuickSearchOpen: boolean;
  toggleSearch: () => void;
  toggleOutliner: () => void;
}

const OutlinerToolbar = observer(
  ({ isOutlinerOpen, isQuickSearchOpen, toggleSearch, toggleOutliner }: IOutlinerToolbar) => (
    <section id="outliner-toolbar">
      <ButtonGroup minimal>
        <Button
          icon={IconSet.OUTLINER}
          onClick={toggleOutliner}
          intent={isOutlinerOpen ? 'primary' : 'none'}
          className="tooltip"
          data-right={Tooltip.Outliner}
        />
        <Button
          icon={IconSet.SEARCH}
          onClick={toggleSearch}
          intent={isQuickSearchOpen ? 'primary' : 'none'}
          className="tooltip"
          data-right={Tooltip.Search}
        />
      </ButtonGroup>
    </section>
  ),
);

/* Library info. Todo: Show entire library count instead of current fileList */
const LibraryInfo = observer(({ fileCount }: { fileCount: number }) => (
  <Button id="media" icon={IconSet.MEDIA} className="tooltip" data-right={Tooltip.Media}>
    {/* {fileCount} item{`${fileCount === 1 ? '' : 's'}`} */}
    {fileCount}
  </Button>
));

interface IFileSelection {
  allFilesSelected: boolean;
  toggleSelection: () => void;
  selectionCount: number;
}

const FileSelection = observer(
  ({ allFilesSelected, toggleSelection: toggle, selectionCount }: IFileSelection) => (
    <Button
      rightIcon={allFilesSelected ? IconSet.SELECT_ALL_CHECKED : IconSet.SELECT_ALL}
      onClick={toggle}
      intent={allFilesSelected ? 'primary' : 'none'}
      className="tooltip"
      data-right={Tooltip.Select}
    >
      {/* {selectionCount} selected */}
      {selectionCount}
    </Button>
  ),
);

interface ITagFilesPopoverProps {
  disabled: boolean;
  files: ClientFile[];
  isOpen: boolean;
  close: () => void;
  toggle: () => void;
}

const TagFilesPopover = observer(
  ({ disabled, files, isOpen, close, toggle }: ITagFilesPopoverProps) => (
    <Popover minimal isOpen={isOpen} onClose={close}>
      <Button
        icon={IconSet.TAG}
        disabled={disabled}
        onClick={toggle}
        className="tooltip"
        data-right={Tooltip.TagFiles}
      />
      <div className="popoverContent">
        <FileTags files={files} autoFocus />
      </div>
    </Popover>
  ),
);

interface IFileFilter {
  fileOrder: FileOrder;
  orderBy: keyof IFile;
  orderFilesBy: (prop: keyof IFile) => void;
  switchFileOrder: () => void;
}

const sortMenuData: Array<{ prop: keyof IFile; icon: JSX.Element; text: string }> = [
  // { prop: 'tags', icon: IconSet.TAG, text: 'Tag' },
  { prop: 'name', icon: IconSet.FILTER_NAME_UP, text: 'Name' },
  { prop: 'extension', icon: IconSet.FILTER_FILE_TYPE, text: 'File type' },
  { prop: 'size', icon: IconSet.FILTER_FILTER_DOWN, text: 'File size' },
  { prop: 'dateAdded', icon: IconSet.FILTER_DATE, text: 'Date added' },
  { prop: 'dateModified', icon: IconSet.FILTER_DATE, text: 'Date modified' },
];

const FileFilter = observer(
  ({ fileOrder, orderBy, orderFilesBy, switchFileOrder }: IFileFilter) => {
    // Render variables
    const sortMenu = useMemo(() => {
      const orderIcon = (
        <Icon icon={fileOrder === 'DESC' ? IconSet.ARROW_DOWN : IconSet.ARROW_UP} />
      );
      return (
        <Menu>
          {sortMenuData.map(({ prop, icon, text }) => (
            <MenuItem
              key={prop}
              icon={icon}
              text={text}
              active={orderBy === prop}
              labelElement={orderBy === prop && orderIcon}
              onClick={() => (orderBy === prop ? switchFileOrder() : orderFilesBy(prop))}
            />
          ))}
        </Menu>
      );
    }, [fileOrder, orderBy, switchFileOrder, orderFilesBy]);

    return (
      <Popover
        minimal
        target={<Button icon={IconSet.FILTER} className="tooltip" data-right={Tooltip.Filter} />}
        content={sortMenu}
      />
    );
  },
);

interface ILayoutOptions {
  method: ViewMethod;
  viewGrid: () => void;
  viewList: () => void;
}

const LayoutOptions = observer(({ method, viewGrid, viewList }: ILayoutOptions) => (
  <ButtonGroup minimal>
    <Button
      onClick={viewList}
      icon={IconSet.VIEW_LIST}
      active={method === 'list'}
      className="tooltip"
      data-right={Tooltip.ViewList}
    />
    <Button
      onClick={viewGrid}
      icon={IconSet.VIEW_GRID}
      active={method === 'grid'}
      className="tooltip"
      data-right={Tooltip.ViewGrid}
    />
    <div id="spacer" style={{ width: '1rem' }} />
  </ButtonGroup>
));

const ContentToolbar = observer(() => {
  const { uiStore, fileStore } = useContext(StoreContext);
  const { fileSelection } = uiStore;
  // If everything is selected, deselect all. Else, select all
  const handleToggleSelect = () =>
    fileSelection.length > 0 && fileSelection.length === fileStore.fileList.length
      ? uiStore.clearFileSelection()
      : uiStore.selectFiles(
          fileStore.fileList.map((f) => f.id).filter((f) => !fileSelection.includes(f)),
        );

  return (
    <section id="main-toolbar">
      {uiStore.view.isSlideMode ? (
        <ButtonGroup minimal>
          {/* Slide mode */}
          <Button
            icon={IconSet.ARROW_LEFT}
            onClick={uiStore.view.disableSlideMode}
            intent="primary"
            className="tooltip"
            data-right={Tooltip.Back}
          >
            Return
          </Button>
        </ButtonGroup>
      ) : (
        <>
          <ButtonGroup minimal>
            <LibraryInfo fileCount={fileStore.fileList.length} />
          </ButtonGroup>

          <ButtonGroup minimal>
            <FileSelection
              allFilesSelected={
                fileSelection.length > 0 && fileSelection.length === fileStore.fileList.length
              }
              toggleSelection={handleToggleSelect}
              selectionCount={fileSelection.length}
            />
            <TagFilesPopover
              files={uiStore.clientFileSelection}
              disabled={fileSelection.length <= 0 || fileStore.fileList.length <= 0}
              isOpen={uiStore.isToolbarTagSelectorOpen}
              close={uiStore.closeToolbarTagSelector}
              toggle={uiStore.toggleToolbarTagSelector}
            />
            <FileFilter
              fileOrder={fileStore.fileOrder}
              orderBy={fileStore.orderBy}
              orderFilesBy={fileStore.orderFilesBy}
              switchFileOrder={fileStore.switchFileOrder}
            />
          </ButtonGroup>

          <LayoutOptions
            method={uiStore.view.method}
            viewGrid={uiStore.view.setMethodGrid}
            viewList={uiStore.view.setMethodList}
          />
        </>
      )}
    </section>
  );
});

interface IInspectorToolbar {
  isInspectorOpen: boolean;
  toggleInspector: () => void;
  toggleSettings: () => void;
}

const InspectorToolbar = observer(
  ({ isInspectorOpen, toggleInspector, toggleSettings }: IInspectorToolbar) => {
    return (
      <section id="inspector-toolbar">
        <ButtonGroup minimal>
          <Button
            icon={IconSet.INFO}
            onClick={toggleInspector}
            intent={isInspectorOpen ? 'primary' : 'none'}
            className="tooltip"
            data-left={Tooltip.Inspector}
          />
          <Button
            icon={IconSet.SETTINGS}
            onClick={toggleSettings}
            className="tooltip"
            data-left={Tooltip.Settings}
          />
        </ButtonGroup>
      </section>
    );
  },
);

const Toolbar = observer(() => {
  const { uiStore } = useContext(StoreContext);

  return (
    <div id="toolbar">
      <OutlinerToolbar
        isOutlinerOpen={uiStore.isOutlinerOpen}
        isQuickSearchOpen={uiStore.isQuickSearchOpen}
        toggleSearch={uiStore.toggleQuickSearch}
        toggleOutliner={uiStore.toggleOutliner}
      />
      <ContentToolbar />
      <InspectorToolbar
        isInspectorOpen={uiStore.isInspectorOpen}
        toggleInspector={uiStore.toggleInspector}
        toggleSettings={uiStore.toggleSettings}
      />
    </div>
  );
});

export default Toolbar;
