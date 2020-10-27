import React, { useContext, useCallback, useState, useEffect, useMemo } from 'react';
import { shell } from 'electron';
import { observer } from 'mobx-react-lite';
import { action, autorun } from 'mobx';

import StoreContext from 'src/renderer/frontend/contexts/StoreContext';
import {
  ClientLocation,
  DEFAULT_LOCATION_ID,
  IDirectoryTreeItem,
} from 'src/renderer/entities/Location';
import { ClientStringSearchCriteria } from 'src/renderer/entities/SearchCriteria';
import { IFile } from 'src/renderer/entities/File';
import { AppToaster } from 'src/renderer/frontend/App';
import { IconSet, Tree } from 'components';
import { Toolbar, ToolbarButton, Menu, MenuItem, ContextMenu, MenuDivider } from 'components/menu';
import { createBranchOnKeyDown, ITreeItem } from 'components/Tree';
import LocationRecoveryDialog from './LocationRecoveryDialog';
import { CustomKeyDict, IExpansionState } from '../../types';
import { LocationRemoval } from 'src/renderer/frontend/components/RemovalAlert';
import useContextMenu from 'src/renderer/frontend/hooks/useContextMenu';
import { Collapse } from 'src/renderer/frontend/components/Transition';
import { RendererMessenger } from 'src/Messaging';

// Tooltip info
const enum Tooltip {
  Location = 'Add New Location',
  Refresh = 'Refresh Directories',
}

interface ITreeData {
  showContextMenu: (x: number, y: number, menu: JSX.Element) => void;
  expansion: IExpansionState;
  setExpansion: React.Dispatch<IExpansionState>;
  delete: (location: ClientLocation) => void;
}

const toggleExpansion = (nodeData: ClientLocation | IDirectoryTreeItem, treeData: ITreeData) => {
  const { expansion, setExpansion } = treeData;
  const id = nodeData instanceof ClientLocation ? nodeData.id : nodeData.fullPath;
  setExpansion({ ...expansion, [id]: !expansion[id] });
};

const isExpanded = (nodeData: ClientLocation | IDirectoryTreeItem, treeData: ITreeData) =>
  treeData.expansion[nodeData instanceof ClientLocation ? nodeData.id : nodeData.fullPath];

// eslint-disable-next-line @typescript-eslint/no-empty-function
const emptyFunction = () => {};

const triggerContextMenuEvent = (event: React.KeyboardEvent<HTMLLIElement>) => {
  const element = event.currentTarget.querySelector('.tree-content-label');
  if (element) {
    // TODO: Auto-focus the context menu! Do this in the onContextMenu handler.
    // Why not trigger context menus through `ContextMenu.show()`?
    event.stopPropagation();
    element.dispatchEvent(
      new MouseEvent('contextmenu', {
        clientX: element.getBoundingClientRect().right,
        clientY: element.getBoundingClientRect().top,
      }),
    );
  }
};

const criteria = (path: string) =>
  new ClientStringSearchCriteria<IFile>('absolutePath', path, 'contains', CustomKeyDict);

const customKeys = (
  search: (path: string) => void,
  event: React.KeyboardEvent<HTMLLIElement>,
  nodeData: ClientLocation | IDirectoryTreeItem,
  treeData: ITreeData,
) => {
  switch (event.key) {
    case 'F10':
      if (event.shiftKey) {
        triggerContextMenuEvent(event);
      }
      break;

    case 'Enter':
      event.stopPropagation();
      search(nodeData instanceof ClientLocation ? nodeData.path : nodeData.fullPath);
      break;

    case 'Delete':
      if (nodeData instanceof ClientLocation) {
        event.stopPropagation();
        treeData.delete(nodeData);
      }
      break;

    case 'ContextMenu':
      triggerContextMenuEvent(event);
      break;

    default:
      break;
  }
};

const DirectoryMenu = ({ path }: { path: string }) => {
  const { uiStore } = useContext(StoreContext);
  const handleOpenFileExplorer = useCallback(() => shell.showItemInFolder(path), [path]);

  const handleAddToSearch = useCallback(() => uiStore.addSearchCriteria(criteria(path)), [
    path,
    uiStore,
  ]);

  const handleReplaceSearch = useCallback(() => uiStore.replaceSearchCriteria(criteria(path)), [
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

interface ILocationContextMenuProps {
  location: ClientLocation;
  onDelete: (location: ClientLocation) => void;
}

const LocationTreeContextMenu = observer(({ location, onDelete }: ILocationContextMenuProps) => {
  const { uiStore } = useContext(StoreContext);
  const openDeleteDialog = useCallback(() => location && onDelete(location), [location, onDelete]);

  if (location.isBroken) {
    return (
      <>
        <MenuItem
          text="Open Recovery Panel"
          onClick={() => uiStore.openLocationRecovery(location.id)}
          icon={IconSet.WARNING_BROKEN_LINK}
          disabled={location.id === DEFAULT_LOCATION_ID}
        />
        <MenuItem
          text="Delete"
          onClick={openDeleteDialog}
          icon={IconSet.DELETE}
          disabled={location.id === DEFAULT_LOCATION_ID}
        />
      </>
    );
  }

  return (
    <>
      <MenuItem
        text="Delete"
        onClick={openDeleteDialog}
        icon={IconSet.DELETE}
        disabled={location.id === DEFAULT_LOCATION_ID}
      />
      <MenuDivider />
      <DirectoryMenu path={location.path} />
    </>
  );
});

const SubLocation = ({
  nodeData,
  treeData,
}: {
  nodeData: IDirectoryTreeItem;
  treeData: ITreeData;
}) => {
  const { uiStore } = useContext(StoreContext);
  const { showContextMenu, expansion } = treeData;
  const handleContextMenu = useCallback(
    (e: React.MouseEvent) =>
      showContextMenu(e.clientX, e.clientY, <DirectoryMenu path={nodeData.fullPath} />),
    [nodeData.fullPath, showContextMenu],
  );

  const handleClick = useCallback(
    (event: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
      // TODO: Mark searched nodes as selected?
      event.ctrlKey
        ? uiStore.addSearchCriteria(criteria(nodeData.fullPath))
        : uiStore.replaceSearchCriteria(criteria(nodeData.fullPath));
    },
    [nodeData.fullPath, uiStore],
  );

  return (
    <div className="tree-content-label" onClick={handleClick} onContextMenu={handleContextMenu}>
      {expansion[nodeData.fullPath] ? IconSet.FOLDER_OPEN : IconSet.FOLDER_CLOSE}
      {nodeData.name}
    </div>
  );
};

const Location = observer(
  ({ nodeData, treeData }: { nodeData: ClientLocation; treeData: ITreeData }) => {
    const { uiStore } = useContext(StoreContext);
    const { showContextMenu, expansion, delete: onDelete } = treeData;
    const handleContextMenu = useCallback(
      (event: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
        showContextMenu(
          event.clientX,
          event.clientY,
          <LocationTreeContextMenu location={nodeData} onDelete={onDelete} />,
        );
      },
      [nodeData, showContextMenu, onDelete],
    );

    const handleClick = useCallback(
      (event: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
        // TODO: Mark searched nodes as selected?
        event.ctrlKey
          ? uiStore.addSearchCriteria(criteria(nodeData.path))
          : uiStore.replaceSearchCriteria(criteria(nodeData.path));
      },
      [nodeData.path, uiStore],
    );

    return (
      <div className="tree-content-label" onContextMenu={handleContextMenu}>
        {nodeData.id === DEFAULT_LOCATION_ID
          ? IconSet.IMPORT
          : expansion[nodeData.id]
          ? IconSet.FOLDER_OPEN
          : IconSet.FOLDER_CLOSE}
        <div onClick={handleClick}>{nodeData.name}</div>
        {nodeData.isBroken && (
          <span onClick={() => uiStore.openLocationRecovery(nodeData.id)}>{IconSet.WARNING}</span>
        )}
      </div>
    );
  },
);

const SubLocationLabel = (nodeData: any, treeData: any) => (
  <SubLocation nodeData={nodeData} treeData={treeData} />
);

const mapDirectory = (dir: IDirectoryTreeItem): ITreeItem => ({
  id: dir.fullPath,
  label: SubLocationLabel,
  nodeData: dir,
  children: dir.children.map(mapDirectory),
  isExpanded,
});

const LocationLabel = (nodeData: any, treeData: any) => (
  <Location nodeData={nodeData} treeData={treeData} />
);

interface ILocationTreeProps {
  showContextMenu: (x: number, y: number, menu: JSX.Element) => void;
  onDelete: (loc: ClientLocation) => void;
}

const LocationsTree = ({ onDelete, showContextMenu }: ILocationTreeProps) => {
  const { locationStore, uiStore } = useContext(StoreContext);
  const [expansion, setExpansion] = useState<IExpansionState>({});
  const treeData: ITreeData = useMemo(
    () => ({
      expansion,
      setExpansion,
      delete: onDelete,
      showContextMenu,
    }),
    [expansion, onDelete, showContextMenu],
  );
  const [branches, setBranches] = useState<ITreeItem[]>([]);

  const handleBranchKeyDown = useCallback(
    (
      event: React.KeyboardEvent<HTMLLIElement>,
      nodeData: ClientLocation | IDirectoryTreeItem,
      treeData: ITreeData,
    ) =>
      createBranchOnKeyDown(
        event,
        nodeData,
        treeData,
        isExpanded,
        emptyFunction,
        toggleExpansion,
        customKeys.bind(null, (path: string) => uiStore.replaceSearchCriteria(criteria(path))),
      ),
    [uiStore],
  );

  useEffect(() => {
    // Prevents updating state when component will be unmounted!
    let isMounted = true;
    const dispose = autorun(() => {
      Promise.all(
        locationStore.locationList.map(async (location) => {
          let children: ITreeItem[];
          try {
            children = (await location.getDirectoryTree()).map(mapDirectory);
          } catch (error) {
            children = [];
          }
          return {
            id: location.id,
            label: LocationLabel,
            children,
            nodeData: location,
            isExpanded,
          };
        }),
      ).then((value) => {
        if (isMounted) {
          setBranches(value);
        }
      });
    });

    () => {
      isMounted = false;
      dispose();
    };
  }, [locationStore.locationList]);

  return (
    <Tree
      id="location-list"
      multiSelect
      children={branches}
      treeData={treeData}
      toggleExpansion={toggleExpansion}
      onBranchKeyDown={handleBranchKeyDown}
      onLeafKeyDown={emptyFunction}
    />
  );
};

const LocationsPanel = () => {
  const { locationStore } = useContext(StoreContext);
  const [contextState, { show, hide }] = useContextMenu();

  const [deletableLocation, setDeletableLocation] = useState<ClientLocation | undefined>(undefined);
  const [isCollapsed, setCollapsed] = useState(false);

  // TODO: Offer option to replace child location(s) with the parent loc, so no data of imported images is lost
  const handleChooseWatchedDir = useCallback(async () => {
    let path: string;
    try {
      const { filePaths } = await RendererMessenger.openDialog({
        properties: ['openDirectory'],
      });
      // multi-selection is disabled which means there can be at most 1 folder
      if (filePaths.length === 0) {
        return;
      }
      path = filePaths[0];
    } catch (error) {
      // TODO: Show error notification.
      console.error(error);
      return;
    }

    if (path === undefined) {
      return;
    }

    // Check if the new location is a sub-directory of an existing location
    const parentDir = locationStore.exists((dir) => path.includes(dir.path));
    if (parentDir) {
      AppToaster.show({
        message: 'You cannot add a location that is a sub-folder of an existing location.',
        intent: 'danger',
      });
      return;
    }

    // Check if the new location is a parent-directory of an existing location
    const childDir = locationStore.exists((dir) => dir.path.includes(path));
    if (childDir) {
      AppToaster.show({
        message: 'You cannot add a location that is a parent-folder of an existing location.',
        intent: 'danger',
      });
      return;
    }

    locationStore
      .create(path)
      .then(action((location: ClientLocation) => locationStore.initializeLocation(location)));
  }, [locationStore]);

  return (
    <div>
      <header>
        <h2 onClick={() => setCollapsed(!isCollapsed)}>Locations</h2>
        <Toolbar controls="location-list">
          <ToolbarButton
            showLabel="never"
            icon={IconSet.FOLDER_CLOSE_ADD}
            text="New Location"
            onClick={handleChooseWatchedDir}
            tooltip={Tooltip.Location}
          />
        </Toolbar>
      </header>
      <Collapse open={!isCollapsed}>
        <LocationsTree showContextMenu={show} onDelete={setDeletableLocation} />
      </Collapse>
      <LocationRecoveryDialog />
      {deletableLocation && (
        <LocationRemoval
          object={deletableLocation}
          onClose={() => setDeletableLocation(undefined)}
        />
      )}
      <ContextMenu open={contextState.open} x={contextState.x} y={contextState.y} onClose={hide}>
        <Menu>{contextState.menu}</Menu>
      </ContextMenu>
    </div>
  );
};

export default LocationsPanel;
