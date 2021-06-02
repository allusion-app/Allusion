import React from 'react';
import { shell } from 'electron';
import { observer } from 'mobx-react-lite';

import { useStore } from 'src/frontend/contexts/StoreContext';
import { ClientLocation } from 'src/entities/Location';
import { IconSet } from 'widgets';
import { MenuItem, MenuDivider } from 'widgets/menus';
import { CustomKeyDict, ClientStringSearchCriteria } from 'src/entities/SearchCriteria';
import { IFile } from 'src/entities/File';
import { useLocationsTreeState } from './LocationsTreeState';

interface IContextMenuProps {
  location: ClientLocation;
}

export const LocationTreeContextMenu = observer(({ location }: IContextMenuProps) => {
  const state = useLocationsTreeState();
  const openDeleteDialog = () => state.tryDeletion(location);

  if (location.isBroken) {
    return (
      <>
        <MenuItem
          text="Open Recovery Panel"
          onClick={() => state.tryRecovery(location)}
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
  const handleOpenFileExplorer = () => shell.showItemInFolder(path);

  const pathCriteria = (path: string) =>
    new ClientStringSearchCriteria<IFile>('absolutePath', path, 'startsWith', CustomKeyDict);

  const handleAddToSearch = () => uiStore.addSearchCriteria(pathCriteria(path));

  const handleReplaceSearch = () => uiStore.replaceSearchCriteria(pathCriteria(path));

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
