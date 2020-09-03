import React, { useContext, useCallback, useState, useEffect, useMemo } from 'react';
import { remote, shell } from 'electron';
import { observer, Observer } from 'mobx-react-lite';
import { H4, Collapse, Menu, MenuItem, Label, ContextMenu } from '@blueprintjs/core';

import StoreContext from 'src/renderer/frontend/contexts/StoreContext';
import IconSet from 'components/Icons';
import { DialogActions, Dialog } from 'components';
import {
  ClientLocation,
  DEFAULT_LOCATION_ID,
  IDirectoryTreeItem,
} from 'src/renderer/entities/Location';
import { ClientStringSearchCriteria } from 'src/renderer/entities/SearchCriteria';
import { IFile } from 'src/renderer/entities/File';
import MultiTagSelector from 'src/renderer/frontend/components/MultiTagSelector';
import { AppToaster } from 'src/renderer/frontend/App';
import UiStore, { FileSearchCriteria } from 'src/renderer/frontend/stores/UiStore';
import { Tree, Toolbar, ToolbarButton } from 'components';
import { ITreeBranch, createBranchOnKeyDown } from 'components/Tree';
import { IExpansionState } from '..';
import LocationRecoveryDialog from './LocationRecoveryDialog';
import { CustomKeyDict } from '../index';
import { LocationRemoval } from 'src/renderer/frontend/components/RemovalAlert';

// Tooltip info
const enum Tooltip {
  Location = 'Add New Location',
  Refresh = 'Refresh Directories',
}

interface ILocationConfigModalProps {
  dir: ClientLocation | undefined;
  handleClose: () => void;
}

const LocationConfigModal = ({ dir, handleClose }: ILocationConfigModalProps) => {
  if (!dir) return <> </>;
  return (
    <Dialog labelledby="dialog-label" describedby="dialog-information" open onClose={handleClose}>
      <span className="dialog-icon">{IconSet.FOLDER_CLOSE}</span>
      <h2 id="dialog-label" className="dialog-label">
        Location: {dir.name}
      </h2>
      <Observer>
        {() => (
          <div id="dialog-information" className="dialog-information">
            <p>Path:</p>
            <pre>{dir.path}</pre>
            <Label>
              <p>Tags to add</p>
              <MultiTagSelector
                disabled={dir.isBroken}
                selectedItems={dir.clientTagsToAdd}
                onTagSelect={dir.addTag}
                onTagDeselect={dir.removeTag}
                onClearSelection={dir.clearTags}
              />
            </Label>
          </div>
        )}
      </Observer>
      <DialogActions
        closeButtonText={dir.isInitialized ? 'Close' : 'Confirm'}
        onClick={handleClose}
      />
    </Dialog>
  );
};

interface ITreeData {
  uiStore: UiStore;
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

const searchLocation = (search: (criteria: FileSearchCriteria) => void, path: string) =>
  search(new ClientStringSearchCriteria<IFile>('absolutePath', path, 'contains', CustomKeyDict));

const customKeys = (
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
      searchLocation(
        treeData.uiStore.replaceSearchCriteria,
        nodeData instanceof ClientLocation ? nodeData.path : nodeData.fullPath,
      );
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

const handleBranchKeyDown = (
  event: React.KeyboardEvent<HTMLLIElement>,
  nodeData: ClientLocation | IDirectoryTreeItem,
  treeData: ITreeData,
) => {
  createBranchOnKeyDown(
    event,
    nodeData,
    treeData,
    isExpanded,
    emptyFunction,
    toggleExpansion,
    customKeys,
  );
};

const DirectoryMenu = ({ path, uiStore }: { path: string; uiStore: UiStore }) => {
  const handleOpenFileExplorer = useCallback(() => shell.openItem(path), [path]);

  const handleAddToSearch = useCallback(() => searchLocation(uiStore.addSearchCriteria, path), [
    path,
    uiStore.addSearchCriteria,
  ]);

  const handleReplaceSearch = useCallback(
    () => searchLocation(uiStore.replaceSearchCriteria, path),
    [path, uiStore.replaceSearchCriteria],
  );

  return (
    <>
      <MenuItem onClick={handleAddToSearch} text="Add to Search Query" icon={IconSet.SEARCH} />
      <MenuItem onClick={handleReplaceSearch} text="Replace Search Query" icon={IconSet.REPLACE} />
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
  uiStore: UiStore;
  onDelete: (location: ClientLocation) => void;
  onConfig: (location: ClientLocation) => void;
}

const LocationTreeContextMenu = ({
  location,
  uiStore,
  onDelete,
  onConfig,
}: ILocationContextMenuProps) => {
  const openDeleteDialog = useCallback(() => location && onDelete(location), [location, onDelete]);
  const openConfigDialog = useCallback(() => location && onConfig(location), [location, onConfig]);

  if (location.isBroken) {
    return (
      <Menu>
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
      </Menu>
    );
  }

  return (
    <Menu>
      <MenuItem text="Configure" onClick={openConfigDialog} icon={IconSet.SETTINGS} />
      <DirectoryMenu path={location.path} uiStore={uiStore} />
      <MenuItem
        text="Delete"
        onClick={openDeleteDialog}
        icon={IconSet.DELETE}
        disabled={location.id === DEFAULT_LOCATION_ID}
      />
    </Menu>
  );
};

const SubLocation = observer(
  ({ nodeData, treeData }: { nodeData: IDirectoryTreeItem; treeData: ITreeData }) => {
    const handleContextMenu = useCallback(
      (event: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
        ContextMenu.show(
          <Menu>
            <DirectoryMenu path={nodeData.fullPath} uiStore={treeData.uiStore} />
          </Menu>,
          { left: event.clientX, top: event.clientY },
          undefined,
          treeData.uiStore.theme === 'DARK',
        );
      },
      [nodeData.fullPath, treeData.uiStore],
    );

    const handleClick = useCallback(
      (event: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
        // TODO: Mark searched nodes as selected?
        event.ctrlKey
          ? searchLocation(treeData.uiStore.addSearchCriteria, nodeData.fullPath)
          : searchLocation(treeData.uiStore.replaceSearchCriteria, nodeData.fullPath);
      },
      [
        nodeData.fullPath,
        treeData.uiStore.addSearchCriteria,
        treeData.uiStore.replaceSearchCriteria,
      ],
    );

    return (
      <div className="tree-content-label" onClick={handleClick} onContextMenu={handleContextMenu}>
        {treeData.expansion[nodeData.fullPath] ? IconSet.FOLDER_OPEN : IconSet.FOLDER_CLOSE}
        {nodeData.name}
      </div>
    );
  },
);

const Location = observer(
  ({ nodeData, treeData }: { nodeData: ClientLocation; treeData: ITreeData }) => {
    const handleContextMenu = useCallback(
      (event: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
        ContextMenu.show(
          <LocationTreeContextMenu
            location={nodeData}
            uiStore={treeData.uiStore}
            onConfig={treeData.config}
            onDelete={treeData.delete}
          />,
          { left: event.clientX, top: event.clientY },
          undefined,
          treeData.uiStore.theme === 'DARK',
        );
      },
      [nodeData, treeData.config, treeData.delete, treeData.uiStore],
    );

    const handleClick = useCallback(
      (event: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
        // TODO: Mark searched nodes as selected?
        event.ctrlKey
          ? searchLocation(treeData.uiStore.addSearchCriteria, nodeData.path)
          : searchLocation(treeData.uiStore.replaceSearchCriteria, nodeData.path);
      },
      [nodeData.path, treeData.uiStore.addSearchCriteria, treeData.uiStore.replaceSearchCriteria],
    );

    return (
      <div className="tree-content-label" onContextMenu={handleContextMenu}>
        {nodeData.id === DEFAULT_LOCATION_ID
          ? IconSet.IMPORT
          : treeData.expansion[nodeData.id]
          ? IconSet.FOLDER_OPEN
          : IconSet.FOLDER_CLOSE}
        <div onClick={handleClick}>{nodeData.name}</div>
        {nodeData.isBroken && (
          <span onClick={() => treeData.uiStore.openLocationRecovery(nodeData.id)}>
            {IconSet.WARNING}
          </span>
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
  lastRefresh: string;
  onDelete: (loc: ClientLocation) => void;
  onConfig: (loc: ClientLocation) => void;
}

const LocationsTree = observer(({ onDelete, onConfig, lastRefresh }: ILocationTreeProps) => {
  const { locationStore, uiStore } = useContext(StoreContext);
  const [expansion, setExpansion] = useState<IExpansionState>({});
  const treeData: ITreeData = useMemo(
    () => ({ expansion, setExpansion, uiStore, delete: onDelete, config: onConfig }),
    [expansion, onConfig, onDelete, uiStore],
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
});

const LocationsPanel = () => {
  const { locationStore } = useContext(StoreContext);

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
        <H4 onClick={() => setCollapsed(!isCollapsed)}>
          {isCollapsed ? IconSet.ARROW_RIGHT : IconSet.ARROW_DOWN}Locations
        </H4>
        <Toolbar controls="location-list">
          <ToolbarButton
            showLabel="never"
            icon={IconSet.FOLDER_CLOSE_ADD}
            label="New Location"
            onClick={handleChooseWatchedDir}
            tooltip={Tooltip.Location}
          />
          <ToolbarButton
            showLabel="never"
            icon={IconSet.RELOAD}
            label="Refresh"
            onClick={() => setLocationTreeKey(new Date())}
            tooltip={Tooltip.Refresh}
          />
        </Toolbar>
      </div>
      <Collapse isOpen={!isCollapsed}>
        <LocationsTree
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
    </div>
  );
};

export default observer(LocationsPanel);
