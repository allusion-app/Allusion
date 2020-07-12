import React from 'react';
import { observer } from 'mobx-react-lite';
import { Button, Popover, Icon, ButtonGroup, Menu, MenuItem } from '@blueprintjs/core';
import IconSet from 'components/Icons';
import { ToolbarTooltips } from '.';
import { ClientFile, IFile } from '../../../entities/File';
import FileTags from '../../components/FileTag';
import { FileOrder } from '../../../backend/DBRepository';
import { useMemo, useContext } from 'react';
import { ViewMethod } from '../../stores/UiStore';
import StoreContext from '../../contexts/StoreContext';

/* Library info. Todo: Show entire library count instead of current fileList */
const LibraryInfo = observer(({ fileCount }: { fileCount: number }) => (
  <Button id="media" icon={IconSet.MEDIA} className="tooltip" data-right={ToolbarTooltips.Media}>
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
      data-right={ToolbarTooltips.Select}
    >
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
        data-right={ToolbarTooltips.TagFiles}
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
        target={
          <Button icon={IconSet.FILTER} className="tooltip" data-right={ToolbarTooltips.Filter} />
        }
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
      data-right={ToolbarTooltips.ViewList}
    />
    <Button
      onClick={viewGrid}
      icon={IconSet.VIEW_GRID}
      active={method === 'grid'}
      className="tooltip"
      data-right={ToolbarTooltips.ViewGrid}
    />
    {/* <div id="spacer" style={{ width: '1rem' }} /> */}
  </ButtonGroup>
));

const ContentToolbar = observer(({ className }: { className?: string }) => {
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
    <section id="main-toolbar" className={className}>
    {/* // <section id="main-toolbar" className={outlinerOpen}> */}
      {uiStore.isSlideMode ? (
        <ButtonGroup minimal>
          {/* Slide mode */}
          <Button
            icon={IconSet.ARROW_LEFT}
            onClick={uiStore.disableSlideMode}
            intent="primary"
            className="tooltip"
            data-right={ToolbarTooltips.Back}
          >
            Return
          </Button>
        </ButtonGroup>
      ) : (
        <>
          <ButtonGroup minimal>
            <Button
              icon={IconSet.SEARCH}
              onClick={uiStore.toggleQuickSearch}
              intent={uiStore.isQuickSearchOpen ? 'primary' : 'none'}
              className="tooltip"
              data-right={ToolbarTooltips.Search}
            />

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
            method={uiStore.method}
            viewGrid={uiStore.setMethodGrid}
            viewList={uiStore.setMethodList}
          />
        </>
      )}
    </section>
  );
});

export default ContentToolbar;
