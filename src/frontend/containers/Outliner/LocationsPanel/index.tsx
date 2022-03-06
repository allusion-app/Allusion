import { shell } from 'electron';
import { action, runInAction } from 'mobx';
import { observer } from 'mobx-react-lite';
import SysPath from 'path';
import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { IFile } from 'src/entities/File';
import { ClientLocation, ClientSubLocation } from 'src/entities/Location';
import { ClientStringSearchCriteria } from 'src/entities/SearchCriteria';
import { LocationRemoval, SubLocationExclusion } from 'src/frontend/components/RemovalAlert';
import { AppToaster } from 'src/frontend/components/Toaster';
import DropContext from 'src/frontend/contexts/DropContext';
import { useStore } from 'src/frontend/contexts/StoreContext';
import { DnDLocationType, useLocationDnD } from 'src/frontend/contexts/TagDnDContext';
import { useAutorun } from 'src/frontend/hooks/mobx';
import useContextMenu from 'src/frontend/hooks/useContextMenu';
import LocationStore from 'src/frontend/stores/LocationStore';
import { triggerContextMenuEvent, emptyFunction } from '../utils';
import { RendererMessenger } from 'src/Messaging';
import { IconSet, Tree } from 'widgets';
import { ContextMenu, Menu, MenuDivider, MenuItem, Toolbar, ToolbarButton } from 'widgets/menus';
import MultiSplitPane, { MultiSplitPaneProps } from 'widgets/MultiSplit/MultiSplitPane';
import { Callout } from 'widgets/notifications';
import { createBranchOnKeyDown, ITreeItem } from 'widgets/Tree';
import { IExpansionState } from '../../types';
import TreeItemRevealer from '../TreeItemRevealer';
import LocationCreationDialog from './LocationCreationDialog';
import LocationRecoveryDialog from './LocationRecoveryDialog';
import { createDragReorderHelper } from '../TreeItemDnD';
import { useFileDropHandling } from './useFileDnD';
import { onDragOver as onDragOverFileDnD } from './dnd';

export class LocationTreeItemRevealer extends TreeItemRevealer {
  private locationStore?: LocationStore;

  public static readonly instance: LocationTreeItemRevealer = new LocationTreeItemRevealer();
  private constructor() {
    super();
  }

  initialize(
    setExpansion: React.Dispatch<React.SetStateAction<IExpansionState>>,
    locationStore: LocationStore,
  ) {
    super.initializeExpansion(setExpansion);
    this.locationStore = locationStore;
    this.revealSubLocation = action(this.revealSubLocation.bind(this));
  }

  revealSubLocation(locationId: string, absolutePath: string) {
    // For every sublocation on its path to the relativePath, expand it, and then scrollTo + focus the item
    const location = this.locationStore?.locationList.find((l) => l.id === locationId);
    if (!location) {
      return;
    }

    const getSubLocationsToFile = (
      loc: ClientSubLocation | ClientLocation,
    ): ClientSubLocation[] => {
      const match = loc.subLocations.find((child) =>
        absolutePath.startsWith(`${child.path}${SysPath.sep}`),
      );
      if (loc instanceof ClientLocation) {
        return match ? getSubLocationsToFile(match) : [];
      }
      return match ? [loc, ...getSubLocationsToFile(match)] : [loc];
    };

    const subLocationsToExpand = getSubLocationsToFile(location);

    // Location's dataId is its ID, subLocation's dataId's are their paths
    this.revealTreeItem([location.id, ...subLocationsToExpand.map((l) => l.path)]);
  }
}

// Tooltip info
const enum Tooltip {
  Location = 'Add new Location',
  Refresh = 'Refresh directories',
}

interface ITreeData {
  showContextMenu: (x: number, y: number, menu: JSX.Element) => void;
  expansion: IExpansionState;
  setExpansion: React.Dispatch<IExpansionState>;
  delete: (location: ClientLocation) => void;
  exclude: (subLocation: ClientSubLocation) => void;
}

const toggleExpansion = (nodeData: ClientLocation | ClientSubLocation, treeData: ITreeData) => {
  const { expansion, setExpansion } = treeData;
  const id = nodeData instanceof ClientLocation ? nodeData.id : nodeData.path;
  setExpansion({ ...expansion, [id]: !expansion[id] });
};

const isExpanded = (nodeData: ClientLocation | ClientSubLocation, treeData: ITreeData) =>
  treeData.expansion[nodeData instanceof ClientLocation ? nodeData.id : nodeData.path];

/** Add an additional / or \ in order to enforce files only in the specific directory are found, not in those starting with same name */
const pathAsSearchPath = (path: string) => `${path}${SysPath.sep}`;

const pathCriteria = (path: string) =>
  new ClientStringSearchCriteria<IFile>('absolutePath', pathAsSearchPath(path), 'startsWith');

const customKeys = (
  search: (path: string) => void,
  event: React.KeyboardEvent<HTMLLIElement>,
  nodeData: ClientLocation | ClientSubLocation,
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
      search(nodeData instanceof ClientLocation ? nodeData.path : nodeData.path);
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

const DirectoryMenu = observer(
  ({
    location,
    onExclude,
  }: {
    location: ClientLocation | ClientSubLocation;
    onExclude: (subLocation: ClientSubLocation) => void;
  }) => {
    const { uiStore } = useStore();

    const path = location instanceof ClientLocation ? location.path : location.path;

    const handleOpenFileExplorer = useCallback(() => shell.showItemInFolder(path), [path]);

    const handleAddToSearch = useCallback(
      () => uiStore.addSearchCriteria(pathCriteria(path)),
      [path, uiStore],
    );

    const handleReplaceSearch = useCallback(
      () => uiStore.replaceSearchCriteria(pathCriteria(path)),
      [path, uiStore],
    );

    return (
      <>
        <MenuItem onClick={handleAddToSearch} text="Add to Search Query" icon={IconSet.SEARCH} />
        <MenuItem
          onClick={handleReplaceSearch}
          text="Replace Search Query"
          icon={IconSet.REPLACE}
        />
        <MenuDivider />
        {location instanceof ClientSubLocation && (
          <MenuItem
            // Only show alert when excluding, not when re-including
            onClick={location.isExcluded ? location.toggleExcluded : () => onExclude(location)}
            text={location.isExcluded ? 'Re-include' : 'Exclude'}
            icon={!location.isExcluded ? IconSet.HIDDEN : IconSet.PREVIEW}
          />
        )}
        <MenuItem
          onClick={handleOpenFileExplorer}
          text="Open in File Browser"
          icon={IconSet.FOLDER_CLOSE}
        />
      </>
    );
  },
);

interface IContextMenuProps {
  location: ClientLocation;
  onDelete: (location: ClientLocation) => void;
  onExclude: (location: ClientSubLocation) => void;
}

const LocationTreeContextMenu = observer(({ location, onDelete, onExclude }: IContextMenuProps) => {
  const { uiStore } = useStore();

  const openDeleteDialog = useCallback(() => onDelete(location), [location, onDelete]);

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
      <DirectoryMenu location={location} onExclude={onExclude} />
      <MenuDivider />
      <MenuItem text="Delete" onClick={openDeleteDialog} icon={IconSet.DELETE} />
    </>
  );
});

const SubLocation = observer((props: { nodeData: ClientSubLocation; treeData: ITreeData }) => {
  const { nodeData, treeData } = props;
  const { uiStore } = useStore();
  const { showContextMenu, expansion, setExpansion } = treeData;
  const handleContextMenu = useCallback(
    (e: React.MouseEvent) =>
      showContextMenu(
        e.clientX,
        e.clientY,
        <DirectoryMenu location={nodeData} onExclude={treeData.exclude} />,
      ),
    [nodeData, showContextMenu, treeData.exclude],
  );

  const existingSearchCrit = uiStore.searchCriteriaList.find(
    (c: any) => c.value === pathAsSearchPath(nodeData.path),
  );
  // const isSearched = Boolean(existingSearchCrit);

  const handleClick = useCallback(
    (event: React.MouseEvent<HTMLElement, MouseEvent>) => {
      existingSearchCrit // toggle search
        ? uiStore.removeSearchCriteria(existingSearchCrit)
        : event.ctrlKey // otherwise add/replace depending on ctrl
        ? uiStore.addSearchCriteria(pathCriteria(nodeData.path))
        : uiStore.replaceSearchCriteria(pathCriteria(nodeData.path));
    },
    [existingSearchCrit, nodeData.path, uiStore],
  );

  const { handleDragEnter, handleDragLeave, handleDrop } = useFileDropHandling(
    nodeData.path,
    nodeData.path,
    expansion,
    setExpansion,
  );

  return (
    <div
      className="tree-content-label"
      aria-disabled={nodeData.isExcluded}
      onClick={handleClick}
      onContextMenu={handleContextMenu}
      onDragEnter={handleDragEnter}
      onDragOver={onDragOverFileDnD}
      onDrop={handleDrop}
      onDragLeave={handleDragLeave}
    >
      {!nodeData.isExcluded
        ? expansion[nodeData.path]
          ? IconSet.FOLDER_OPEN
          : IconSet.FOLDER_CLOSE
        : IconSet.HIDDEN}
      <div className="label-text">{nodeData.name}</div>
      {/* Indicates whether this item is being searched */}
      {/* TODO: disabled for now; Feels very unnatural in combination with the indicator+button of the Tag */}
      {/* <span className="indicator" aria-hidden={!isSearched}>
        {isSearched ? IconSet.SEARCH : null}
      </span> */}
    </div>
  );
});

const DnDHelper = createDragReorderHelper('locations-dnd-preview', DnDLocationType);

const Location = observer(
  ({ nodeData, treeData }: { nodeData: ClientLocation; treeData: ITreeData }) => {
    const { uiStore, locationStore } = useStore();
    const { showContextMenu, expansion, delete: onDelete } = treeData;
    const handleContextMenu = useCallback(
      (event: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
        showContextMenu(
          event.clientX,
          event.clientY,
          <LocationTreeContextMenu
            location={nodeData}
            onDelete={onDelete}
            onExclude={treeData.exclude}
          />,
        );
      },
      [showContextMenu, nodeData, onDelete, treeData.exclude],
    );

    // TODO: idem
    const existingSearchCrit = uiStore.searchCriteriaList.find(
      (c: any) => c.value === pathAsSearchPath(nodeData.path),
    );

    const handleClick = useCallback(
      (event: React.MouseEvent<HTMLElement, MouseEvent>) => {
        existingSearchCrit // toggle search
          ? uiStore.removeSearchCriteria(existingSearchCrit)
          : event.ctrlKey
          ? uiStore.addSearchCriteria(pathCriteria(nodeData.path))
          : uiStore.replaceSearchCriteria(pathCriteria(nodeData.path));
      },
      [existingSearchCrit, nodeData.path, uiStore],
    );

    const fileDnD = useFileDropHandling(
      nodeData.id,
      nodeData.path,
      expansion,
      treeData.setExpansion,
    );

    const dndData = useLocationDnD();
    const handleDragStart = useCallback(
      (event: React.DragEvent<HTMLDivElement>) =>
        runInAction(() =>
          DnDHelper.onDragStart(event, nodeData.name, uiStore.theme, dndData, nodeData),
        ),
      [dndData, nodeData, uiStore],
    );

    const handleDragOver = useCallback(
      (event: React.DragEvent<HTMLDivElement>) => {
        const ignored = DnDHelper.onDragOver(event, dndData, false);
        if (ignored) {
          onDragOverFileDnD(event);
        }
      },
      [dndData],
    );

    const handleDragLeave = useCallback(
      (event: React.DragEvent<HTMLDivElement>) => {
        runInAction(() => {
          const ignored = DnDHelper.onDragLeave(event);
          if (ignored) {
            fileDnD.handleDragLeave(event);
          }
        });
      },
      [fileDnD],
    );

    const handleDrop = useCallback(
      (event: React.DragEvent<HTMLDivElement>) => {
        runInAction(() => {
          if (!dndData.source || !event.dataTransfer.types.includes(DnDLocationType)) {
            fileDnD.handleDrop(event);
            return;
          }
          const relativeMovePos = DnDHelper.onDrop(event);

          if (relativeMovePos === 'middle') {
            // not possible for locations, no middle position allowed
          } else {
            let target = nodeData;
            if (relativeMovePos === -1) {
              const index = locationStore.locationList.indexOf(target) - 1;
              if (index >= 0) {
                target = locationStore.locationList[index];
              }
            }
            locationStore.reorder(dndData.source, target);
          }
        });
      },
      [dndData.source, fileDnD, nodeData, locationStore],
    );

    return (
      <div
        className="tree-content-label"
        onClick={handleClick}
        onContextMenu={handleContextMenu}
        draggable
        onDragEnter={fileDnD.handleDragEnter}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {nodeData.isInitialized && !nodeData.isRefreshing
          ? expansion[nodeData.id]
            ? IconSet.FOLDER_OPEN
            : IconSet.FOLDER_CLOSE
          : IconSet.LOADING}
        <div className="label-text">{nodeData.name}</div>
        {nodeData.isBroken ? (
          <span onClick={() => uiStore.openLocationRecovery(nodeData.id)}>{IconSet.WARNING}</span>
        ) : // Indicates whether this item is being searched
        // TODO: disabled for now; Feels very unnatural in combination with the indicator+button of the Tag
        // <span className="indicator" aria-hidden={!isSearched}>
        //   {isSearched ? IconSet.SEARCH : null}
        // </span>
        null}
      </div>
    );
  },
);

const SubLocationLabel = ({ nodeData, treeData }: { nodeData: any; treeData: any }) => (
  <SubLocation nodeData={nodeData} treeData={treeData} />
);

const mapDirectory = (dir: ClientSubLocation): ITreeItem => ({
  id: dir.path,
  label: SubLocationLabel,
  nodeData: dir,
  children: dir.subLocations.map(mapDirectory),
  isExpanded,
});

const LocationLabel = ({ nodeData, treeData }: { nodeData: any; treeData: any }) => (
  <Location nodeData={nodeData} treeData={treeData} />
);

interface ILocationTreeProps {
  showContextMenu: (x: number, y: number, menu: JSX.Element) => void;
  onDelete: (loc: ClientLocation) => void;
  onExclude: (loc: ClientSubLocation) => void;
}

const LocationsTree = ({ onDelete, onExclude, showContextMenu }: ILocationTreeProps) => {
  const { locationStore, uiStore } = useStore();
  const [expansion, setExpansion] = useState<IExpansionState>({});
  const treeData: ITreeData = useMemo<ITreeData>(
    () => ({
      expansion,
      setExpansion,
      delete: onDelete,
      exclude: onExclude,
      showContextMenu,
    }),
    [expansion, onDelete, onExclude, showContextMenu],
  );
  const [branches, setBranches] = useState<ITreeItem[]>([]);

  const handleBranchKeyDown = useCallback(
    (
      event: React.KeyboardEvent<HTMLLIElement>,
      nodeData: ClientLocation | ClientSubLocation,
      treeData: ITreeData,
    ) =>
      createBranchOnKeyDown(
        event,
        nodeData,
        treeData,
        isExpanded,
        emptyFunction,
        toggleExpansion,
        customKeys.bind(null, (path: string) => uiStore.replaceSearchCriteria(pathCriteria(path))),
      ),
    [uiStore],
  );

  useAutorun(() => {
    setBranches(
      locationStore.locationList.map((location) => ({
        id: location.id,
        label: LocationLabel,
        children: location.subLocations.map(mapDirectory),
        nodeData: location,
        isExpanded,
      })),
    );
  });
  // TODO: re-run when location (sub)-folder updates: add "lastUpdated" field to location, update when location watcher notices changes?

  useEffect(
    () => LocationTreeItemRevealer.instance.initialize(setExpansion, locationStore),
    [locationStore],
  );

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

const LocationsPanel = observer((props: Partial<MultiSplitPaneProps>) => {
  const { locationStore } = useStore();
  const [contextState, { show, hide }] = useContextMenu();

  const [creatableLocation, setCreatableLocation] = useState<ClientLocation>();
  const [deletableLocation, setDeletableLocation] = useState<ClientLocation>();
  const [excludableSubLocation, setExcludableSubLocation] = useState<ClientSubLocation>();

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

    // Check if the new location already exists
    const existingDir = locationStore.exists((dir) => path === dir.path);
    if (existingDir) {
      AppToaster.show({
        message: 'This folder has already been added as a location.',
        timeout: 5000,
      });
      return;
    }

    // Check if the new location is a sub-directory of an existing location
    const parentDir = locationStore.exists((dir) => path.includes(dir.path));
    if (parentDir) {
      AppToaster.show({
        message: 'You cannot add a location that is a sub-folder of an existing location.',
        timeout: 5000,
      });
      return;
    }

    // Check if the new location is a parent-directory of an existing location
    // Need to add a separator at the end, otherwise the new path /foo is detected as a parent of existing location /football.
    // - /foo/ is not a parent directory of /football
    // - /foo/ is     a parent directory of /foo/bar
    const pathWithSeparator = path.endsWith(SysPath.sep) ? path : path + SysPath.sep;
    const childDir = locationStore.exists((dir) => dir.path.includes(pathWithSeparator));
    if (childDir) {
      AppToaster.show({
        message: 'You cannot add a location that is a parent-folder of an existing location.',
        timeout: 5000,
      });
      return;
    }

    locationStore.create(path).then(setCreatableLocation);
  }, [locationStore]);

  const isEmpty = locationStore.locationList.length === 0;
  // Detect file dropping and show a blue outline around location panel
  const { isDropping } = useContext(DropContext);

  // FIXME: something is broken with the isDropping detection. there was "isEmpty || isDropping" in here before
  return (
    <MultiSplitPane
      id="locations"
      title="Locations"
      className={`${isEmpty ? 'attention' : ''} ${isDropping ? 'info' : ''}`}
      headerToolbar={
        <Toolbar controls="location-list" isCompact>
          {locationStore.locationList.length > 0 && (
            <ToolbarButton
              icon={IconSet.RELOAD_COMPACT}
              text="Refresh"
              onClick={action(() =>
                locationStore.locationList.forEach((loc) =>
                  loc.refreshSublocations().catch(console.error),
                ),
              )}
              tooltip={Tooltip.Refresh}
            />
          )}
          <ToolbarButton
            icon={IconSet.PLUS}
            text="New Location"
            onClick={handleChooseWatchedDir}
            tooltip={Tooltip.Location}
          />
        </Toolbar>
      }
      {...props}
    >
      <LocationsTree
        showContextMenu={show}
        onDelete={setDeletableLocation}
        onExclude={setExcludableSubLocation}
      />
      {isEmpty && <Callout icon={IconSet.INFO}>Click + to choose a location.</Callout>}

      <LocationRecoveryDialog />

      {creatableLocation && (
        <LocationCreationDialog
          location={creatableLocation}
          onClose={() => setCreatableLocation(undefined)}
        />
      )}
      {deletableLocation && (
        <LocationRemoval
          object={deletableLocation}
          onClose={() => setDeletableLocation(undefined)}
        />
      )}
      {excludableSubLocation && (
        <SubLocationExclusion
          object={excludableSubLocation}
          onClose={() => setExcludableSubLocation(undefined)}
        />
      )}
      <ContextMenu
        isOpen={contextState.open}
        x={contextState.x}
        y={contextState.y}
        close={hide}
        usePortal
      >
        <Menu>{contextState.menu}</Menu>
      </ContextMenu>
    </MultiSplitPane>
  );
});

export default LocationsPanel;
