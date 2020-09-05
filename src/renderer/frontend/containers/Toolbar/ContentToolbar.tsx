import React, { useCallback } from 'react';
import { observer } from 'mobx-react-lite';
import { Popover, Icon, Menu, MenuItem, KeyCombo } from '@blueprintjs/core';
import IconSet from 'components/Icons';
import { Tooltip } from '.';
import { ToolbarButton, ToolbarToggleButton } from 'components';
import { IFile } from '../../../entities/File';
import FileTags from '../../components/FileTag';
import { FileOrder } from '../../../backend/DBRepository';
import { useMemo, useContext } from 'react';
import StoreContext from '../../contexts/StoreContext';
import { FileRemoval } from 'src/renderer/frontend/components/RemovalAlert';

interface IFileSelection {
  allFilesSelected: boolean;
  toggleSelection: () => void;
  selectionCount: number;
}

const FileSelection = observer(
  ({ allFilesSelected, toggleSelection: toggle, selectionCount }: IFileSelection) => (
    <ToolbarToggleButton
      showLabel="always"
      icon={allFilesSelected ? IconSet.SELECT_ALL_CHECKED : IconSet.SELECT_ALL}
      onClick={toggle}
      pressed={allFilesSelected}
      text={selectionCount}
      tooltip={Tooltip.Select}
    />
  ),
);

const RemoveFilesPopover = observer(() => {
  const { uiStore } = useContext(StoreContext);
  return (
    <>
      <ToolbarButton
        icon={IconSet.DELETE}
        disabled={uiStore.fileSelection.size === 0}
        onClick={uiStore.openToolbarFileRemover}
        text="Delete"
        tooltip={Tooltip.Delete}
        // Giving it a warning intent will make it stand out more - it is usually hidden so it might not be obviously discovered
        // intent="warning"
      />
      <FileRemoval
        onClose={uiStore.closeToolbarFileRemover}
        object={uiStore.isToolbarFileRemoverOpen ? uiStore.clientFileSelection : []}
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
      <Popover minimal openOnTargetFocus={false} usePortal={false} content={sortMenu}>
        <ToolbarButton icon={IconSet.FILTER} text="Filter" tooltip={Tooltip.Filter} />
      </Popover>
    );
  },
);

const LayoutOptions = observer(() => {
  const { uiStore } = useContext(StoreContext);
  return (
    <Popover minimal openOnTargetFocus={false} usePortal={false}>
      <ToolbarButton icon={IconSet.THUMB_BG} text="View" tooltip={Tooltip.View} />
      <Menu>
        <MenuItem
          icon={IconSet.VIEW_LIST}
          onClick={uiStore.setMethodList}
          active={uiStore.isList}
          text="List View"
          labelElement={<KeyCombo minimal combo={uiStore.hotkeyMap.viewList} />}
        />
        <MenuItem
          icon={IconSet.VIEW_GRID}
          onClick={uiStore.setMethodGrid}
          active={uiStore.isGrid}
          text="Grid View"
          labelElement={<KeyCombo minimal combo={uiStore.hotkeyMap.viewGrid} />}
        />
      </Menu>
    </Popover>
  );
});

const SlideModeToolbar = observer(() => {
  const { uiStore } = useContext(StoreContext);
  return (
    <ToolbarButton
      showLabel="always"
      icon={IconSet.ARROW_LEFT}
      onClick={uiStore.disableSlideMode}
      text="Return"
      tooltip={Tooltip.Back}
    />
  );
});

const ContentToolbar = observer(() => {
  const { uiStore, fileStore } = useContext(StoreContext);
  const { fileSelection } = uiStore;

  // If everything is selected, deselect all. Else, select all
  const handleToggleSelect = useCallback(
    () =>
      fileSelection.size > 0 && fileSelection.size === fileStore.fileList.length
        ? uiStore.clearFileSelection()
        : uiStore.selectAllFiles(),
    [fileSelection, fileStore.fileList, uiStore],
  );

  if (uiStore.isSlideMode) {
    return <SlideModeToolbar />;
  } else {
    return (
      <>
        <FileSelection
          allFilesSelected={
            fileSelection.size > 0 && fileSelection.size === fileStore.fileList.length
          }
          toggleSelection={handleToggleSelect}
          selectionCount={fileSelection.size}
        />

        {fileStore.content === 'missing' ? (
          // Only show option to remove selected files in toolbar when viewing missing files */}
          <RemoveFilesPopover />
        ) : (
          // Only show when not viewing missing files (so it is replaced by the Delete button)
          <FileTags files={fileSelection.size > 0 ? uiStore.clientFileSelection : []} />
        )}

        <FileFilter
          fileOrder={fileStore.fileOrder}
          orderBy={fileStore.orderBy}
          orderFilesBy={fileStore.orderFilesBy}
          switchFileOrder={fileStore.switchFileOrder}
        />

        <LayoutOptions />

        <ToolbarToggleButton
          icon={IconSet.SEARCH}
          onClick={uiStore.toggleQuickSearch}
          pressed={uiStore.isQuickSearchOpen}
          text="Search"
          tooltip={Tooltip.Search}
        />
      </>
    );
  }
});

export default ContentToolbar;
