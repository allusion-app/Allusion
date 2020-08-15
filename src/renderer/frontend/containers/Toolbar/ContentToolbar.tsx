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
import { FileRemoval } from '../Outliner/MessageBox';

/* Library info. Todo: Show entire library count instead of current fileList */
// const LibraryInfo = observer(({ fileCount }: { fileCount: number }) => (
//   <Button id="media" icon={IconSet.MEDIA} className="tooltip" data-right={ToolbarTooltips.Media}>
//     {fileCount}
//   </Button>
// ));

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
      active={allFilesSelected}
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
  hidden?: boolean;
}

const TagFilesPopover = observer(
  ({ disabled, files, isOpen, close, toggle, hidden }: ITagFilesPopoverProps) => (
    <Popover minimal isOpen={isOpen} onClose={close}>
      {hidden ? (
        <></>
      ) : (
        <Button
          icon={IconSet.TAG}
          disabled={disabled}
          onClick={toggle}
          className="tooltip"
          data-right={ToolbarTooltips.TagFiles}
        />
      )}
      <FileTags files={files} autoFocus />
    </Popover>
  ),
);

interface IRemoveFilesPopoverProps {
  hidden?: boolean;
  disabled?: boolean;
}
const RemoveFilesPopover = observer(({ hidden, disabled }: IRemoveFilesPopoverProps) => {
  const { uiStore } = useContext(StoreContext);
  const theme = uiStore.theme === 'DARK' ? 'bp3-dark' : 'bp3-light';
  return (
    <>
      {hidden ? null : (
        <Button
          icon={IconSet.DELETE}
          disabled={disabled}
          onClick={uiStore.toggleToolbarFileRemover}
          className="tooltip"
          data-right={ToolbarTooltips.Delete}
          // Giving it a warning intent will make it stand out more - it is usually hidden so it might not be obviously discovered
          intent="warning"
        />
      )}
      <FileRemoval
        isOpen={uiStore.isToolbarFileRemoverOpen}
        onClose={uiStore.toggleToolbarFileRemover}
        theme={theme}
        object={uiStore.clientFileSelection}
      />
    </>
  );
});

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
  </ButtonGroup>
));

const SlideModeToolbar = observer(() => {
  const { uiStore } = useContext(StoreContext);
  return (
    <ButtonGroup id="main-toolbar" minimal>
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
  );
});

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

  if (uiStore.isSlideMode) {
    return <SlideModeToolbar />;
  } else {
    return (
      <div id="main-toolbar">
        <ButtonGroup minimal>
          <Button
            icon={IconSet.SEARCH}
            onClick={uiStore.toggleQuickSearch}
            active={uiStore.isQuickSearchOpen}
            className="tooltip"
            data-right={ToolbarTooltips.Search}
          />
        </ButtonGroup>

        <ButtonGroup minimal>
          <FileSelection
            allFilesSelected={
              fileSelection.length > 0 && fileSelection.length === fileStore.fileList.length
            }
            toggleSelection={handleToggleSelect}
            selectionCount={fileSelection.length}
          />

          {/* Only show when not viewing missing files (so it is replaced by the Delete button) */}
          <TagFilesPopover
            files={uiStore.clientFileSelection}
            disabled={fileSelection.length <= 0 || fileStore.fileList.length <= 0}
            isOpen={uiStore.isToolbarTagSelectorOpen}
            close={uiStore.closeToolbarTagSelector}
            toggle={uiStore.toggleToolbarTagSelector}
            hidden={fileStore.content === 'missing'}
          />

          {/* Only show option to remove selected files in toolbar when viewing missing files */}
          <RemoveFilesPopover
            hidden={fileStore.content !== 'missing'}
            disabled={uiStore.fileSelection.length === 0}
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
      </div>
    );
  }
});

export default ContentToolbar;
