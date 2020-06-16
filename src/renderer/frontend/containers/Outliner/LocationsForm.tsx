import React, { useContext, useCallback, useState, useEffect } from 'react';
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
  ITreeNode,
  Tree,
  ContextMenu,
} from '@blueprintjs/core';

import StoreContext from '../../contexts/StoreContext';
import IconSet from '../../components/Icons';
import {
  ClientLocation,
  DEFAULT_LOCATION_ID,
  IDirectoryTreeItem,
} from '../../../entities/Location';
import { ClientStringSearchCriteria } from '../../../entities/SearchCriteria';
import { IFile } from '../../../entities/File';
import MultiTagSelector from '../../components/MultiTagSelector';
import { AppToaster } from '../../App';
import LocationStore from '../../stores/LocationStore';
import UiStore from '../../UiStore';
import LocationRecoveryDialog from '../../components/LocationRecoveryDialog';
import { CustomKeyDict } from './SearchForm';

// Tooltip info
const enum Tooltip {
  Location = 'Add New Location',
  Refresh = 'Refresh directories',
}

interface ILocationTreeProps {
  onDelete: (loc: ClientLocation) => void;
  onConfig: (loc: ClientLocation) => void;
}

const LocationTreeContextMenu = ({
  path,
  locationStore,
  uiStore,
  onDelete,
  onConfig,
}: { path: string; locationStore: LocationStore; uiStore: UiStore } & ILocationTreeProps) => {
  const loc = locationStore.locationList.find((l) => l.path === path);
  const isLocation = loc !== undefined;
  const isImportLocation = loc?.id === DEFAULT_LOCATION_ID;

  const openDeleteDialog = useCallback(() => loc && onDelete(loc), [loc, onDelete]);
  const openConfigDialog = useCallback(() => loc && onConfig(loc), [loc, onConfig]);
  const handleOpenFileExplorer = useCallback(() => shell.openItem(path), [path]);

  const addToSearch = useCallback(
    () =>
      uiStore.addSearchCriteria(
        new ClientStringSearchCriteria<IFile>('absolutePath', path, 'contains', CustomKeyDict),
      ),
    [path, uiStore],
  );

  const replaceSearch = useCallback(
    () =>
      uiStore.replaceSearchCriteria(
        new ClientStringSearchCriteria<IFile>('absolutePath', path, 'contains', CustomKeyDict),
      ),
    [uiStore, path],
  );

  return (
    <Menu>
      <MenuItem
        text="Configure"
        onClick={openConfigDialog}
        icon={IconSet.SETTINGS}
        disabled={!loc}
      />
      <MenuItem onClick={addToSearch} text="Add to Search Query" icon={IconSet.SEARCH} />
      <MenuItem onClick={replaceSearch} text="Replace Search Query" icon={IconSet.REPLACE} />
      <MenuItem
        onClick={handleOpenFileExplorer}
        text="Open in File Browser"
        icon={IconSet.FOLDER_CLOSE}
      />
      <MenuItem
        text="Delete"
        onClick={openDeleteDialog}
        icon={IconSet.DELETE}
        disabled={!isLocation || isImportLocation}
      />
    </Menu>
  );
};

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
              <div>
                <p>
                  Path: <pre>{dir.path}</pre>
                </p>
              </div>
              <div>
                <Label>
                  <p>Tags to add</p>
                  <MultiTagSelector
                    selectedItems={dir.clientTagsToAdd}
                    onTagSelect={dir.addTag}
                    onTagDeselect={dir.removeTag}
                    onClearSelection={dir.clearTags}
                  />
                </Label>
              </div>
            </>
          )}
        </Observer>
      </div>

      <div className={Classes.DIALOG_FOOTER}>
        <div className={Classes.DIALOG_FOOTER_ACTIONS}>
          <Button onClick={handleClose} intent="primary">
            {dir.isInitialized ? 'Close' : 'Confirm'}
          </Button>
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

function dirItemAsTreeNode(dirItem: IDirectoryTreeItem): ITreeNode<string> {
  return {
    id: dirItem.fullPath,
    label: dirItem.name,
    nodeData: dirItem.fullPath,
    childNodes:
      dirItem.children.length === 0
        ? [{ id: `${dirItem.fullPath}-empty`, label: <i>No subfolders</i> }]
        : dirItem.children.map(dirItemAsTreeNode),
    hasCaret: true,
  };
}

const LocationRootLabel = observer(({ location }: { location: ClientLocation }) => (
  <span
    className="tooltip"
    data-right={`${location.isBroken ? 'Cannot find this location: ' : ''} ${location.path}`}
  >
    {Path.basename(location.path)}
  </span>
));

const LocationsTree = observer(({ onDelete, onConfig }: ILocationTreeProps) => {
  const { locationStore, uiStore } = useContext(StoreContext);

  const [nodes, setNodes] = useState<ITreeNode<ClientLocation | string>[]>(
    locationStore.locationList.map((location) => ({
      id: location.id,
      label: <LocationRootLabel location={location} />,
      nodeData: location,
      icon: location.id === DEFAULT_LOCATION_ID ? 'import' : IconSet.FOLDER_CLOSE,
      secondaryLabel: (
        <Observer>
          {() =>
            location.isBroken ? (
              <Button
                icon={IconSet.WARNING}
                onClick={(e: React.MouseEvent) =>
                  void e.stopPropagation() || uiStore.openLocationRecovery(location.id)
                }
              />
            ) : (
              <></>
            )
          }
        </Observer>
      ),
    })),
  );

  useEffect(() => {
    locationStore.locationList.forEach((loc, locIndex) =>
      loc.getDirectoryTree().then((children) =>
        setNodes((nodes) => {
          const newNodes = [...nodes];
          newNodes[locIndex].childNodes = children.map(dirItemAsTreeNode);
          return newNodes;
        }),
      ),
    );
  }, [locationStore.locationList]);

  const addToSearch = useCallback(
    (path: string) =>
      uiStore.addSearchCriteria(
        new ClientStringSearchCriteria<IFile>('absolutePath', path, 'contains', CustomKeyDict),
      ),
    [uiStore],
  );

  const replaceSearch = useCallback(
    (path: string) =>
      uiStore.replaceSearchCriteria(
        new ClientStringSearchCriteria<IFile>('absolutePath', path, 'contains', CustomKeyDict),
      ),
    [uiStore],
  );

  const handleNodeClick = useCallback(
    (node: ITreeNode<ClientLocation | string>, _path: number[], e: React.MouseEvent) => {
      if (node.nodeData) {
        const path = typeof node.nodeData === 'string' ? node.nodeData : node.nodeData.path;
        // TODO: Mark searched nodes as selected, similar to tags
        e.ctrlKey ? addToSearch(path) : replaceSearch(path);
      }
    },
    [addToSearch, replaceSearch],
  );

  const handleNodeExpand = useCallback(
    (node: ITreeNode<ClientLocation | string>) => {
      node.isExpanded = true;
      setNodes([...nodes]);
    },
    [nodes],
  );

  const handleNodeCollapse = useCallback(
    (node: ITreeNode<ClientLocation | string>) => {
      node.isExpanded = false;
      setNodes([...nodes]);
    },
    [nodes],
  );

  const handleNodeContextMenu = useCallback(
    (node: ITreeNode<ClientLocation | string>, _: number[], e: React.MouseEvent<HTMLElement>) => {
      // The empty folder markers have path (nodeData) specified -no need for context menu
      if (node.nodeData) {
        ContextMenu.show(
          <LocationTreeContextMenu
            path={typeof node.nodeData === 'string' ? node.nodeData : node.nodeData.path}
            locationStore={locationStore}
            uiStore={uiStore}
            onConfig={onConfig}
            onDelete={onDelete}
          />,
          { left: e.clientX, top: e.clientY },
        );
      }
    },
    [locationStore, onConfig, onDelete, uiStore],
  );

  return (
    <Tree
      contents={nodes}
      onNodeClick={handleNodeClick}
      onNodeExpand={handleNodeExpand}
      onNodeCollapse={handleNodeCollapse}
      onNodeContextMenu={handleNodeContextMenu}
    />
  );
});

const LocationsForm = () => {
  const { locationStore } = useContext(StoreContext);

  const [locationConfigOpen, setLocationConfigOpen] = useState<ClientLocation | undefined>(
    undefined,
  );
  const closeConfig = useCallback(() => {
    if (locationConfigOpen !== undefined && !locationConfigOpen.isInitialized) {
      // Import files after config modal is closed, if not already initialized
      locationStore.initializeLocation(locationConfigOpen);
    }
    setLocationConfigOpen(undefined);
  }, [locationConfigOpen, locationStore]);

  const [locationRemoverOpen, setLocationRemoverOpen] = useState<ClientLocation | undefined>(
    undefined,
  );
  const closeLocationRemover = useCallback(() => {
    setLocationRemoverOpen(undefined);
    // Initialize the location in case it was newly added
    if (locationConfigOpen && !locationConfigOpen.isInitialized) {
      locationStore.initializeLocation(locationConfigOpen);
    }
  }, [locationConfigOpen, locationStore]);

  const [locationTreeKey, setLocationTreeKey] = useState(new Date());
  const handleRefresh = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation();
    setLocationTreeKey(new Date());
  }, []);

  const [isCollapsed, setCollapsed] = useState(false);
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

  const toggleLocations = useCallback(() => setCollapsed(!isCollapsed), [
    isCollapsed,
    setCollapsed,
  ]);

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
          {/* <Icon className="custom-icon-14" icon={isCollapsed ? IconSet.ARROW_RIGHT : IconSet.ARROW_DOWN}/> */}
          {/* <Icon className="custom-icon-14" icon={isCollapsed ? IconSet.ARROW_RIGHT : IconSet.ARROW_DOWN}/> */}
          Locations
        </H4>
        <Button
          minimal
          icon={IconSet.FOLDER_CLOSE_ADD}
          onClick={handleChooseWatchedDir}
          className="tooltip"
          data-left={Tooltip.Location}
        />
        <Button
          minimal
          icon={IconSet.RELOAD}
          onClick={handleRefresh}
          className="tooltip"
          data-left={Tooltip.Refresh}
        />
      </div>
      <Collapse isOpen={!isCollapsed}>
        <LocationsTree
          key={locationTreeKey.toString()}
          onDelete={setLocationRemoverOpen}
          onConfig={setLocationConfigOpen}
        />
      </Collapse>

      <LocationConfigModal dir={locationConfigOpen} handleClose={closeConfig} />
      <LocationRemovalAlert dir={locationRemoverOpen} handleClose={closeLocationRemover} />

      <LocationRecoveryDialog onDelete={setLocationRemoverOpen} />
    </div>
  );
};

export default observer(LocationsForm);
