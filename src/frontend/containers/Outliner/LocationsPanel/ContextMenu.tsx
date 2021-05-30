import React, { useCallback } from 'react';
import { shell } from 'electron';
import { observer } from 'mobx-react-lite';

import { useStore } from 'src/frontend/contexts/StoreContext';
import { ClientLocation } from 'src/entities/Location';
import { IconSet } from 'widgets';
import { MenuItem, MenuDivider } from 'widgets/menus';
import { ClientStringSearchCriteria } from 'src/entities/SearchCriteria';
import { IFile } from 'src/entities/File';
import { CustomKeyDict } from '../../types';

interface IContextMenuProps {
  location: ClientLocation;
  onDelete: (location: ClientLocation) => void;
}

export const LocationTreeContextMenu = observer(({ location, onDelete }: IContextMenuProps) => {
  const { uiStore } = useStore();
  const openDeleteDialog = useCallback(() => location && onDelete(location), [location, onDelete]);

  if (location.isBroken) {
    return (
      <>
        <MenuItem
          text="Open Recovery Panel"
          onClick={() => uiStore.openLocationRecovery(location.id)}
          icon={IconSet.WARNING_BROKEN_LINK}
        />
        <MenuItem text="Delete" onClick={openDeleteDialog} icon={IconSet.DELETE} />
      </>
    );
  }

  return (
    <>
      <DirectoryMenu path={location.path} />
      <MenuDivider />
      <MenuItem text="Delete" onClick={openDeleteDialog} icon={IconSet.DELETE} />
    </>
  );
});

export const DirectoryMenu = ({ path }: { path: string }) => {
  const { uiStore } = useStore();
  const handleOpenFileExplorer = useCallback(() => shell.showItemInFolder(path), [path]);

  const handleAddToSearch = useCallback(() => uiStore.addSearchCriteria(pathCriteria(path)), [
    path,
    uiStore,
  ]);

  const handleReplaceSearch = useCallback(() => uiStore.replaceSearchCriteria(pathCriteria(path)), [
    path,
    uiStore,
  ]);

  return (
    <>
      <MenuItem onClick={handleAddToSearch} text="Add to Search Query" icon={IconSet.SEARCH} />
      <MenuItem onClick={handleReplaceSearch} text="Replace Search Query" icon={IconSet.REPLACE} />
      <MenuDivider />
      <MenuItem
        onClick={handleOpenFileExplorer}
        text="Open in File Browser"
        icon={IconSet.FOLDER_CLOSE}
      />
    </>
  );
};

const pathCriteria = (path: string) =>
  new ClientStringSearchCriteria<IFile>('absolutePath', path, 'startsWith', CustomKeyDict);
