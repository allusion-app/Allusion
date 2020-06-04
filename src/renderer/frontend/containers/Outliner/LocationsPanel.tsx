import React, { useContext, useCallback, useState, useEffect, useMemo } from 'react';
import { remote, shell } from 'electron';
import Path from 'path';
import { observer, Observer } from 'mobx-react-lite';
import {
  Button,
  H4,
  Collapse,
  Menu,
  MenuItem,
  Classes,
  Alert,
  Dialog,
  Label,
  ContextMenu,
} from '@blueprintjs/core';

import StoreContext from '../../contexts/StoreContext';
import IconSet from 'components/Icons';
import {
  ClientLocation,
  DEFAULT_LOCATION_ID,
  IDirectoryTreeItem,
} from '../../../entities/Location';
import { ClientStringSearchCriteria } from '../../../entities/SearchCriteria';
import { IFile } from '../../../entities/File';
import MultiTagSelector from '../../components/MultiTagSelector';
import { AppToaster } from '../../App';
import UiStore, { FileSearchCriteria } from '../../UiStore';
import { Tree } from 'components';
import { ITreeBranch, createBranchOnKeyDown } from 'components/Tree';

// Tooltip info
const enum Tooltip {
  Location = 'Add New Location',
  Refresh = 'Refresh directories',
}

interface ILocationConfigModalProps {
  dir: ClientLocation | undefined;
  handleClose: () => void;
}

const LocationConfigModal = ({ dir, handleClose }: ILocationConfigModalProps) => {
  if (!dir) return <> </>;
  return (
    <Dialog
      title={
        <span className="ellipsis" title={dir.path}>
          Location: {Path.basename(dir.path)}
        </span>
      }
      icon={IconSet.FOLDER_CLOSE}
      isOpen={Boolean(dir)}
      onClose={handleClose}
      className={Classes.DARK}
    >
      <div className={Classes.DIALOG_BODY}>
        <Observer>
          {() => (
            <>
              <p>Path:</p>
              <pre>{dir.path}</pre>
              <Label>
                <p>Tags to add</p>
                <MultiTagSelector
                  selectedItems={dir.clientTagsToAdd}
                  onTagSelect={dir.addTag}
                  onTagDeselect={dir.removeTag}
                  onClearSelection={dir.clearTags}
                />
              </Label>
            </>
          )}
        </Observer>
      </div>

      <div className={Classes.DIALOG_FOOTER}>
        <div className={Classes.DIALOG_FOOTER_ACTIONS}>
          <Button onClick={handleClose}>{dir.isInitialized ? 'Close' : 'Confirm'}</Button>
        </div>
      </div>
    </Dialog>
  );
};

interface ILocationRemovalAlertProps {
  dir: ClientLocation | undefined;
  handleClose: () => void;
}

const LocationRemovalAlert = ({ dir, handleClose }: ILocationRemovalAlertProps) => {
  const { locationStore } = useContext(StoreContext);
  const handleRemove = useCallback(() => {
    if (dir) {
      locationStore.removeDirectory(dir.id);
      handleClose();
    }
  }, [dir, handleClose, locationStore]);

  if (!dir) return <> </>;

  return (
    <Alert
      isOpen={Boolean(dir)}
      cancelButtonText="Cancel"
      confirmButtonText="Delete"
      icon={IconSet.DELETE}
      intent="danger"
      onCancel={handleClose}
      onConfirm={handleRemove}
      canEscapeKeyCancel
      canOutsideClickCancel
      className={Classes.DARK}
    >
      <div className="bp3-dark" id="deleteFile">
        <h4 className="bp3-heading inpectorHeading">Confirm delete</h4>
        <p>
          Remove {`"${Path.basename(dir.path)}"`} from your locations?
          <br />
          This will remove all files it contains from Allusion.
        </p>
      </div>
    </Alert>
  );
};

interface ILocationTreeData {
  uiStore: UiStore;
  expansion: IExpansionState;
  setExpansion: React.Dispatch<IExpansionState>;
  config: (location: ClientLocation) => void;
  delete: (location: ClientLocation) => void;
}

type IExpansionState = { [key: string]: boolean };

const toggleExpansion = (
  nodeData: ClientLocation | IDirectoryTreeItem,
  treeData: ILocationTreeData,
) => {
  const { expansion, setExpansion } = treeData;
  const id = nodeData instanceof ClientLocation ? nodeData.id : nodeData.fullPath;
  setExpansion({ ...expansion, [id]: !expansion[id] });
};

const isExpanded = (nodeData: ClientLocation | IDirectoryTreeItem, treeData: ILocationTreeData) =>
  treeData.expansion[nodeData instanceof ClientLocation ? nodeData.id : nodeData.fullPath];

// eslint-disable-next-line @typescript-eslint/no-empty-function
const emptyFunction = () => {};

const handleBranchKeyDown = (
  event: React.KeyboardEvent<HTMLLIElement>,
  nodeData: ClientLocation | IDirectoryTreeItem,
  treeData: ILocationTreeData,
) => {
  createBranchOnKeyDown(event, nodeData, treeData, isExpanded, emptyFunction, toggleExpansion);
};

const searchLocation = (search: (criteria: FileSearchCriteria) => void, path: string) =>
  search(new ClientStringSearchCriteria<IFile>('path', path, 'contains'));

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
  ({ nodeData, treeData }: { nodeData: IDirectoryTreeItem; treeData: ILocationTreeData }) => {
    const handleContextMenu = useCallback(
      (event: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
        ContextMenu.show(
          <Menu>
            <DirectoryMenu path={nodeData.fullPath} uiStore={treeData.uiStore} />
          </Menu>,
          { left: event.clientX, top: event.clientY },
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
        <span className="pre-icon">
          {treeData.expansion[nodeData.fullPath] ? IconSet.FOLDER_OPEN : IconSet.FOLDER_CLOSE}
        </span>
        {nodeData.name}
      </div>
    );
  },
);

const Location = observer(
  ({ nodeData, treeData }: { nodeData: ClientLocation; treeData: ILocationTreeData }) => {
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
      <div className="tree-content-label" onClick={handleClick} onContextMenu={handleContextMenu}>
        <span className="pre-icon">
          {nodeData.id === DEFAULT_LOCATION_ID ? IconSet.IMPORT : IconSet.LOCATIONS}
        </span>
        {nodeData.name}
        {nodeData.isBroken && <span className="after-icon">{IconSet.WARNING}</span>}
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
  const treeData: ILocationTreeData = useMemo(
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
    let isSubscribed = true;
    Promise.all(
      locationStore.locationList.map(async (location) => ({
        id: location.id,
        label: LocationLabel,
        branches: (await location.getDirectoryTree()).map(mapDirectory),
        leaves: [],
        nodeData: location,
        isExpanded,
      })),
    ).then((value) => {
      if (isSubscribed) {
        console.log('Refreshed!', value);
        setBranches(value);
      }
    });

    return () => {
      isSubscribed = false;
    };
  }, [locationStore.locationList, lastRefresh]);

  return (
    <Tree
      autoFocus
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
  const [locationRemoverOpen, setLocationRemoverOpen] = useState<ClientLocation | undefined>(
    undefined,
  );
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
    setLocationRemoverOpen(undefined);
    // Initialize the location in case it was newly added
    if (locationConfigOpen && !locationConfigOpen.isInitialized) {
      locationStore.initializeLocation(locationConfigOpen);
    }
  }, [locationConfigOpen, locationStore]);

  const handleRefresh = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation();
    setLocationTreeKey(new Date());
  }, []);

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
      handleRefresh();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [handleRefresh, locationStore],
  );

  const toggleLocations = useCallback(() => setCollapsed(!isCollapsed), [isCollapsed]);

  // Refresh when adding/removing location
  useEffect(() => {
    handleRefresh();
  }, [handleRefresh, locationStore.locationList.length]);

  return (
    <div>
      <div className="outliner-header-wrapper" onClick={toggleLocations}>
        <H4 className="bp3-heading">
          <span className="bp3-icon custom-icon custom-icon-14">
            {isCollapsed ? IconSet.ARROW_RIGHT : IconSet.ARROW_DOWN}
          </span>
          Locations
        </H4>
        <Button
          minimal
          icon={IconSet.FOLDER_CLOSE_ADD}
          onClick={handleChooseWatchedDir}
          className="tooltip"
          data-right={Tooltip.Location}
        />
        <Button
          minimal
          icon={IconSet.RELOAD}
          onClick={handleRefresh}
          className="tooltip"
          data-right={Tooltip.Refresh}
        />
      </div>
      <Collapse isOpen={!isCollapsed}>
        <LocationsTree
          lastRefresh={locationTreeKey.toString()}
          onDelete={setLocationRemoverOpen}
          onConfig={setLocationConfigOpen}
        />
      </Collapse>

      <LocationConfigModal dir={locationConfigOpen} handleClose={closeConfig} />
      <LocationRemovalAlert dir={locationRemoverOpen} handleClose={closeLocationRemover} />
    </div>
  );
};

export default observer(LocationsPanel);
