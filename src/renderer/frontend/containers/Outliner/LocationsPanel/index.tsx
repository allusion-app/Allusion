import React, { useContext, useCallback, useState, useEffect, useMemo } from 'react';
import { remote, shell } from 'electron';
import { observer } from 'mobx-react-lite';

import StoreContext from 'src/renderer/frontend/contexts/StoreContext';
import {
  ClientLocation,
  DEFAULT_LOCATION_ID,
  IDirectoryTreeItem,
} from 'src/renderer/entities/Location';
import { ClientStringSearchCriteria } from 'src/renderer/entities/SearchCriteria';
import { IFile } from 'src/renderer/entities/File';
import { MultiTagSelector } from 'src/renderer/frontend/components/MultiTagSelector';
import { AppToaster } from 'src/renderer/frontend/App';
import { IconButton, IconSet, Tree } from 'components';
import { Toolbar, ToolbarButton, Menu, MenuItem, ContextMenu, MenuDivider } from 'components/menu';
import { DialogActions, Dialog } from 'components/popover';
import { ITreeBranch, createBranchOnKeyDown } from 'components/Tree';
import LocationRecoveryDialog from './LocationRecoveryDialog';
import { CustomKeyDict, IExpansionState } from '../../types';
import { LocationRemoval } from 'src/renderer/frontend/components/RemovalAlert';
import useContextMenu from 'src/renderer/frontend/hooks/useContextMenu';
import { Collapse } from 'src/renderer/frontend/components/Transition';

// Tooltip info
const enum Tooltip {
  Location = 'Add New Location',
  Refresh = 'Refresh Directories',
}

interface ILocationConfigModalProps {
  dir: ClientLocation | undefined;
  handleClose: () => void;
}

const LocationConfigModal = observer(({ dir, handleClose }: ILocationConfigModalProps) => {
  if (!dir) {
    return null;
  }
  return (
    <Dialog labelledby="dialog-title" describedby="dialog-information" open onCancel={handleClose}>
      <span className="dialog-icon">{IconSet.FOLDER_CLOSE}</span>
      <h2 id="dialog-title" className="dialog-title">
        Location: {dir.name}
      </h2>
      <IconButton icon={IconSet.CLOSE} text="Close (Esc)" onClick={handleClose} />
      <div id="dialog-information" className="dialog-information">
        <p>Path:</p>
        <pre>{dir.path}</pre>
        <label>
          Tags to add
          <MultiTagSelector
            disabled={dir.isBroken}
            selection={dir.clientTagsToAdd}
            onSelect={dir.addTag}
            onDeselect={dir.removeTag}
            onClear={dir.clearTags}
          />
        </label>
      </div>
      <div className="dialog-footer">
        <DialogActions
          closeButtonText={dir.isInitialized ? 'Close' : 'Confirm'}
          onClick={handleClose}
        />
      </div>
    </Dialog>
  );
});

interface ITreeData {
  showContextMenu: (x: number, y: number, menu: JSX.Element) => void;
  expansion: IExpansionState;
  setExpansion: React.Dispatch<IExpansionState>;
  config: (location: ClientLocation) => void;
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
  const handleOpenFileExplorer = useCallback(() => shell.openItem(path), [path]);

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
  onConfig: (location: ClientLocation) => void;
}

const LocationTreeContextMenu = ({ location, onDelete, onConfig }: ILocationContextMenuProps) => {
  const { uiStore } = useContext(StoreContext);
  const openDeleteDialog = useCallback(() => location && onDelete(location), [location, onDelete]);
  const openConfigDialog = useCallback(() => location && onConfig(location), [location, onConfig]);

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
      <MenuItem text="Configure" onClick={openConfigDialog} icon={IconSet.SETTINGS} />
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
};

const SubLocation = observer(
  ({ nodeData, treeData }: { nodeData: IDirectoryTreeItem; treeData: ITreeData }) => {
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
  },
);

const Location = observer(
  ({ nodeData, treeData }: { nodeData: ClientLocation; treeData: ITreeData }) => {
    const { uiStore } = useContext(StoreContext);
    const { showContextMenu, expansion, config, delete: onDelete } = treeData;
    const handleContextMenu = useCallback(
      (event: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
        showContextMenu(
          event.clientX,
          event.clientY,
          <LocationTreeContextMenu location={nodeData} onConfig={config} onDelete={onDelete} />,
        );
      },
      [nodeData, showContextMenu, config, onDelete],
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

const mapDirectory = (dir: IDirectoryTreeItem): ITreeBranch => ({
  id: dir.fullPath,
  label: SubLocationLabel,
  nodeData: dir,
  branches: dir.children.map(mapDirectory),
  leaves: [],
  isExpanded,
});

const LocationLabel = (nodeData: any, treeData: any) => (
  <Location nodeData={nodeData} treeData={treeData} />
);

interface ILocationTreeProps {
  showContextMenu: (x: number, y: number, menu: JSX.Element) => void;
  lastRefresh: string;
  onDelete: (loc: ClientLocation) => void;
  onConfig: (loc: ClientLocation) => void;
}

const LocationsTree = observer(
  ({ onDelete, onConfig, lastRefresh, showContextMenu }: ILocationTreeProps) => {
    const { locationStore, uiStore } = useContext(StoreContext);
    const [expansion, setExpansion] = useState<IExpansionState>({});
    const treeData: ITreeData = useMemo(
      () => ({
        expansion,
        setExpansion,
        delete: onDelete,
        config: onConfig,
        showContextMenu,
      }),
      [expansion, onConfig, onDelete, showContextMenu],
    );
    const [branches, setBranches] = useState<ITreeBranch[]>(
      locationStore.locationList.map((location) => ({
        id: location.id,
        label: LocationLabel,
        branches: [],
        leaves: [],
        nodeData: location,
        isExpanded,
      })),
    );

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
      if (isMounted) {
        Promise.all(
          locationStore.locationList.map(async (location) => ({
            id: location.id,
            label: LocationLabel,
            branches: (await location.getDirectoryTree()).map(mapDirectory),
            leaves: [],
            nodeData: location,
            isExpanded,
          })),
        ).then((value) => setBranches(value));
      }
      return () => {
        isMounted = false;
      };
    }, [locationStore.locationList, lastRefresh]);

    return (
      <Tree
        id="location-list"
        multiSelect
        branches={branches}
        leaves={[]}
        treeData={treeData}
        toggleExpansion={toggleExpansion}
        onBranchKeyDown={handleBranchKeyDown}
        onLeafKeyDown={emptyFunction}
      />
    );
  },
);

const LocationsPanel = () => {
  const { locationStore } = useContext(StoreContext);
  const [contextState, { show, hide }] = useContextMenu();

  const [locationConfigOpen, setLocationConfigOpen] = useState<ClientLocation | undefined>(
    undefined,
  );
  const [deletableLocation, setDeletableLocation] = useState<ClientLocation | undefined>(undefined);
  const [locationTreeKey, setLocationTreeKey] = useState(new Date());
  const [isCollapsed, setCollapsed] = useState(false);

  const closeConfig = useCallback(() => {
    if (locationConfigOpen !== undefined && !locationConfigOpen.isInitialized) {
      // Import files after config modal is closed, if not already initialized
      locationStore.initializeLocation(locationConfigOpen);
    }
    setLocationConfigOpen(undefined);
  }, [locationConfigOpen, locationStore]);

  const closeLocationRemover = useCallback(() => {
    setDeletableLocation(undefined);
    // Initialize the location in case it was newly added
    if (locationConfigOpen && !locationConfigOpen.isInitialized) {
      locationStore.initializeLocation(locationConfigOpen);
    }
  }, [locationConfigOpen, locationStore]);

  const handleChooseWatchedDir = useCallback(
    async (e: React.MouseEvent) => {
      e.stopPropagation();
      const dirs = remote.dialog.showOpenDialogSync({
        properties: ['openDirectory'],
      });

      // multi-selection is disabled which means there can be at most 1 folder
      if (!dirs || dirs.length === 0) {
        return;
      }
      const newLocPath = dirs[0];

      // Check if the new location is a sub-directory of an existing location
      const parentDir = locationStore.locationList.find((dir) => newLocPath.includes(dir.path));
      if (parentDir) {
        AppToaster.show({
          message: 'You cannot add a location that is a sub-folder of an existing location.',
          intent: 'danger',
        });
        return;
      }

      // Check if the new location is a parent-directory of an existing location
      const childDir = locationStore.locationList.find((dir) => dir.path.includes(newLocPath));
      if (childDir) {
        AppToaster.show({
          message: 'You cannot add a location that is a parent-folder of an existing location.',
          intent: 'danger',
        });
        return;
      }

      // TODO: Offer option to replace child location(s) with the parent loc, so no data of imported images is lost

      const newLoc = await locationStore.addDirectory(newLocPath);
      setLocationConfigOpen(newLoc);
      setLocationTreeKey(new Date());
    },
    [locationStore],
  );

  // Refresh when adding/removing location
  useEffect(() => {
    setLocationTreeKey(new Date());
  }, [locationStore.locationList.length]);

  return (
    <div>
      <div className="outliner-header-wrapper">
        <h2 onClick={() => setCollapsed(!isCollapsed)}>
          {isCollapsed ? IconSet.ARROW_RIGHT : IconSet.ARROW_DOWN}Locations
        </h2>
        <Toolbar controls="location-list">
          <ToolbarButton
            showLabel="never"
            icon={IconSet.FOLDER_CLOSE_ADD}
            text="New Location"
            onClick={handleChooseWatchedDir}
            tooltip={Tooltip.Location}
          />
          <ToolbarButton
            showLabel="never"
            icon={IconSet.RELOAD}
            text="Refresh"
            onClick={() => setLocationTreeKey(new Date())}
            tooltip={Tooltip.Refresh}
          />
        </Toolbar>
      </div>
      <Collapse open={!isCollapsed}>
        <LocationsTree
          showContextMenu={show}
          lastRefresh={locationTreeKey.toString()}
          onDelete={setDeletableLocation}
          onConfig={setLocationConfigOpen}
        />
      </Collapse>
      <LocationConfigModal dir={locationConfigOpen} handleClose={closeConfig} />
      <LocationRecoveryDialog />
      {deletableLocation && (
        <LocationRemoval object={deletableLocation} onClose={closeLocationRemover} />
      )}
      <ContextMenu open={contextState.open} x={contextState.x} y={contextState.y} onClose={hide}>
        <Menu>{contextState.menu}</Menu>
      </ContextMenu>
    </div>
  );
};

export default observer(LocationsPanel);
