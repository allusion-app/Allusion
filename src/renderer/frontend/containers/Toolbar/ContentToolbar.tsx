import React, { useCallback } from 'react';
import { observer } from 'mobx-react-lite';
import { Popover, Icon, Menu, MenuItem, KeyCombo } from '@blueprintjs/core';
import IconSet from 'components/Icons';
import { Tooltip } from '.';
import { ToolbarButton, ToolbarGroup, ToolbarToggleButton } from 'components';
import { ClientFile, IFile } from '../../../entities/File';
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
      label={selectionCount}
      tooltip={Tooltip.Select}
    />
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
  ({ disabled, files, isOpen, close, toggle, hidden }: ITagFilesPopoverProps) => {
    if (hidden) {
      return null;
    }
    return (
      <Popover minimal openOnTargetFocus={false} usePortal={false} isOpen={isOpen} onClose={close}>
        <ToolbarButton
          icon={IconSet.TAG}
          disabled={disabled}
          onClick={toggle}
          label="Tag"
          tooltip={Tooltip.TagFiles}
        />
        <FileTags files={files} autoFocus />
      </Popover>
    );
  },
);

interface IRemoveFilesPopoverProps {
  hidden?: boolean;
  disabled?: boolean;
}

const RemoveFilesPopover = observer(({ hidden, disabled }: IRemoveFilesPopoverProps) => {
  const { uiStore } = useContext(StoreContext);
  if (hidden) {
    return (
      <FileRemoval
        onClose={() => {
          if (uiStore.isToolbarFileRemoverOpen) {
            uiStore.toggleToolbarFileRemover();
          }
        }}
        object={uiStore.isToolbarFileRemoverOpen ? uiStore.clientFileSelection : []}
      />
    );
  }
  return (
    <>
      <ToolbarButton
        icon={IconSet.DELETE}
        disabled={disabled}
        onClick={uiStore.toggleToolbarFileRemover}
        label="Delete"
        tooltip={Tooltip.Delete}
        // Giving it a warning intent will make it stand out more - it is usually hidden so it might not be obviously discovered
        // intent="warning"
      />
      <FileRemoval
        onClose={() => {
          if (uiStore.isToolbarFileRemoverOpen) {
            uiStore.toggleToolbarFileRemover();
          }
        }}
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
        <ToolbarButton icon={IconSet.FILTER} label="Filter" tooltip={Tooltip.Filter} />
      </Popover>
    );
  },
);

const LayoutOptions = observer(() => {
  const { uiStore } = useContext(StoreContext);
  return (
    <ToolbarGroup>
      <Popover minimal openOnTargetFocus={false} usePortal={false}>
        <ToolbarButton icon={IconSet.THUMB_BG} label="View" tooltip={Tooltip.View} />
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
          <MenuItem disabled icon={IconSet.VIEW_MASON} text="Masonry View (WIP)" />
        </Menu>
      </Popover>
    </ToolbarGroup>
  );
});

const SlideModeToolbar = observer(() => {
  const { uiStore } = useContext(StoreContext);
  return (
    <ToolbarGroup id="main-toolbar">
      <ToolbarButton
        showLabel="always"
        icon={IconSet.ARROW_LEFT}
        onClick={uiStore.disableSlideMode}
        label="Return"
        tooltip={Tooltip.Back}
      />
    </ToolbarGroup>
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
      <ToolbarGroup id="main-toolbar">
        <ToolbarGroup>
          <ToolbarToggleButton
            icon={IconSet.SEARCH}
            onClick={uiStore.toggleQuickSearch}
            pressed={uiStore.isQuickSearchOpen}
            label="Search"
            tooltip={Tooltip.Search}
          />
        </ToolbarGroup>

        <ToolbarGroup>
          <FileSelection
            allFilesSelected={
              fileSelection.size > 0 && fileSelection.size === fileStore.fileList.length
            }
            toggleSelection={handleToggleSelect}
            selectionCount={fileSelection.size}
          />

          {/* Only show when not viewing missing files (so it is replaced by the Delete button) */}
          <TagFilesPopover
            files={uiStore.isToolbarTagSelectorOpen ? uiStore.clientFileSelection : []}
            disabled={fileSelection.size === 0 || fileStore.fileList.length === 0}
            isOpen={uiStore.isToolbarTagSelectorOpen}
            close={uiStore.closeToolbarTagSelector}
            toggle={uiStore.toggleToolbarTagSelector}
            hidden={fileStore.content === 'missing'}
          />

          {/* Only show option to remove selected files in toolbar when viewing missing files */}
          <RemoveFilesPopover
            hidden={fileStore.content !== 'missing'}
            disabled={uiStore.fileSelection.size === 0}
          />

          <FileFilter
            fileOrder={fileStore.fileOrder}
            orderBy={fileStore.orderBy}
            orderFilesBy={fileStore.orderFilesBy}
            switchFileOrder={fileStore.switchFileOrder}
          />
        </ToolbarGroup>

        <LayoutOptions />
      </ToolbarGroup>
    );
  }
});

export default ContentToolbar;
