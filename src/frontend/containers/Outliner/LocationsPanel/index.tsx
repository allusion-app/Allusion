import React, { useContext, useCallback, useState, useEffect, useMemo } from 'react';
import { shell } from 'electron';
import { observer } from 'mobx-react-lite';
import { action, autorun, runInAction } from 'mobx';
import SysPath from 'path';

import { RendererMessenger } from 'src/Messaging';
import { useStore } from 'src/frontend/contexts/StoreContext';
import useContextMenu from 'src/frontend/hooks/useContextMenu';
import { ClientLocation, ClientSubLocation } from 'src/entities/Location';
import { ClientStringSearchCriteria, CustomKeyDict } from 'src/entities/SearchCriteria';
import { IFile } from 'src/entities/File';
import { IconSet, Tree } from 'widgets';
import { Toolbar, ToolbarButton, Menu, MenuItem, ContextMenu, MenuDivider } from 'widgets/menus';
import { createBranchOnKeyDown, ITreeItem } from 'widgets/Tree';
import { IExpansionState } from '../../types';
import LocationRecoveryDialog from './LocationRecoveryDialog';
import { LocationRemoval, SubLocationExclusion } from 'src/frontend/components/RemovalAlert';
import { Collapse } from 'src/frontend/components/Collapse';
import { AppToaster } from 'src/frontend/components/Toaster';
import { handleDragLeave, isAcceptableType, onDragOver, storeDroppedImage } from './dnd';
import { DnDAttribute } from 'src/frontend/contexts/TagDnDContext';
import DropContext from 'src/frontend/contexts/DropContext';
import LocationCreationDialog from './LocationCreationDialog';
import LocationStore from 'src/frontend/stores/LocationStore';
import TreeItemRevealer from '../TreeItemRevealer';

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
  }

  revealSubLocation(locationId: string, absolutePath: string) {
    runInAction(() => {
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
        if (loc instanceof ClientLocation) return match ? getSubLocationsToFile(match) : [];
        return match ? [loc, ...getSubLocationsToFile(match)] : [loc];
      };

      const subLocationsToExpand = getSubLocationsToFile(location);

      // Location's dataId is its ID, subLocation's dataId's are their paths
      this.revealTreeItem([location.id, ...subLocationsToExpand.map((l) => l.path)]);
    });
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

// eslint-disable-next-line @typescript-eslint/no-empty-function
const emptyFunction = () => {};

const triggerContextMenuEvent = (event: React.KeyboardEvent<HTMLLIElement>) => {
  const element = event.currentTarget.querySelector('.tree-content-label');
  if (element !== null) {
    event.stopPropagation();
    const rect = element.getBoundingClientRect();
    element.dispatchEvent(
      new MouseEvent('contextmenu', {
        clientX: rect.right,
        clientY: rect.top,
        bubbles: true,
      }),
    );
  }
};

/** Add an additional / or \ in order to enforce files only in the specific directory are found, not in those starting with same name */
const pathAsSearchPath = (path: string) => `${path}${SysPath.sep}`;

const pathCriteria = (path: string) =>
  new ClientStringSearchCriteria<IFile>(
    'absolutePath',
    pathAsSearchPath(path),
    'startsWith',
    CustomKeyDict,
  );

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

const DirectoryMenu = ({
  location,
  onExclude,
}: {
  location: ClientLocation | ClientSubLocation;
  onExclude: (subLocation: ClientSubLocation) => void;
}) => {
  const { uiStore } = useStore();

  const path = location instanceof ClientLocation ? location.path : location.path;

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
      {location instanceof ClientSubLocation && (
        <MenuItem
          // Only show alert when excluding, not when re-including
          onClick={location.isExcluded ? location.toggleExcluded : () => onExclude(location)}
          text={location.isExcluded ? 'Re-include' : 'Exclude'}
          icon={location.isExcluded ? IconSet.HIDDEN : IconSet.PREVIEW}
        />
      )}
      <MenuItem
        onClick={handleOpenFileExplorer}
        text="Open in File Browser"
        icon={IconSet.FOLDER_CLOSE}
      />
    </>
  );
};

interface IContextMenuProps {
  location: ClientLocation;
  onDelete: (location: ClientLocation) => void;
  onExclude: (location: ClientSubLocation) => void;
}

const LocationTreeContextMenu = observer(({ location, onDelete, onExclude }: IContextMenuProps) => {
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
      <DirectoryMenu location={location} onExclude={onExclude} />
      <MenuDivider />
      <MenuItem text="Delete" onClick={openDeleteDialog} icon={IconSet.DELETE} />
    </>
  );
});

export const HOVER_TIME_TO_EXPAND = 600;

const useFileDropHandling = (
  expansionId: string,
  fullPath: string,
  expansion: IExpansionState,
  setExpansion: (s: IExpansionState) => void,
) => {
  // Don't expand immediately, only after hovering over it for a second or so
  const [expandTimeoutId, setExpandTimeoutId] = useState<number>();
  const expandDelayed = useCallback(() => {
    if (expandTimeoutId) clearTimeout(expandTimeoutId);
    const t = window.setTimeout(() => {
      setExpansion({ ...expansion, [expansionId]: true });
    }, HOVER_TIME_TO_EXPAND);
    setExpandTimeoutId(t);
  }, [expandTimeoutId, expansion, expansionId, setExpansion]);

  const handleDragEnter = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.stopPropagation();
      event.preventDefault();
      const canDrop = onDragOver(event);
      if (canDrop && !expansion[expansionId]) {
        expandDelayed();
      }
    },
    [expansion, expansionId, expandDelayed],
  );

  const handleDrop = useCallback(
    async (event: React.DragEvent<HTMLDivElement>) => {
      event.currentTarget.dataset[DnDAttribute.Target] = 'false';

      if (isAcceptableType(event)) {
        event.dataTransfer.dropEffect = 'none';
        try {
          await storeDroppedImage(event, fullPath);
        } catch (e) {
          console.error(e);
          AppToaster.show({
            message: 'Something went wrong, could not import image :(',
            timeout: 100,
          });
        }
      } else {
        AppToaster.show({ message: 'File type not supported :(', timeout: 100 });
      }
    },
    [fullPath],
  );

  const handleDragLeaveWrapper = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      // Drag events are also triggered for children??
      // We don't want to detect dragLeave of a child as a dragLeave of the target element, so return immmediately
      if ((event.target as HTMLElement).contains(event.relatedTarget as HTMLElement)) return;

      event.stopPropagation();
      event.preventDefault();
      handleDragLeave(event);
      if (expandTimeoutId) {
        clearTimeout(expandTimeoutId);
        setExpandTimeoutId(undefined);
      }
    },
    [expandTimeoutId],
  );

  return {
    handleDragEnter,
    handleDrop,
    handleDragLeave: handleDragLeaveWrapper,
  };
};

const SubLocation = ({
  nodeData,
  treeData,
}: {
  nodeData: ClientSubLocation;
  treeData: ITreeData;
}) => {
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

  const handleClick = useCallback(
    (event: React.MouseEvent<HTMLElement, MouseEvent>) => {
      event.ctrlKey
        ? uiStore.addSearchCriteria(pathCriteria(nodeData.path))
        : uiStore.replaceSearchCriteria(pathCriteria(nodeData.path));
    },
    [nodeData.path, uiStore],
  );

  const { handleDragEnter, handleDragLeave, handleDrop } = useFileDropHandling(
    nodeData.path,
    nodeData.path,
    expansion,
    setExpansion,
  );

  const isSearched = uiStore.searchCriteriaList.some(
    (val) => (val as ClientStringSearchCriteria<IFile>).value === pathAsSearchPath(nodeData.path),
  );

  return (
    <div
      className="tree-content-label"
      aria-disabled={nodeData.isExcluded}
      // onClick={handleClick}
      onContextMenu={handleContextMenu}
      onDragEnter={handleDragEnter}
      onDrop={handleDrop}
      onDragLeave={handleDragLeave}
      // Note: onDragOver is not needed here, but need to preventDefault() for onDrop to work 🙃
      onDragOver={onDragOver}
    >
      {!nodeData.isExcluded
        ? expansion[nodeData.path]
          ? IconSet.FOLDER_OPEN
          : IconSet.FOLDER_CLOSE
        : IconSet.HIDDEN}
      <div>{nodeData.name}</div>
      <button onClick={handleClick} className="btn btn-icon" aria-hidden={!isSearched}>
        {isSearched ? IconSet.SEARCH : IconSet.ADD}
      </button>
    </div>
  );
};

const Location = observer(
  ({ nodeData, treeData }: { nodeData: ClientLocation; treeData: ITreeData }) => {
    const { uiStore } = useStore();
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

    const handleClick = useCallback(
      (event: React.MouseEvent<HTMLElement, MouseEvent>) => {
        event.ctrlKey
          ? uiStore.addSearchCriteria(pathCriteria(nodeData.path))
          : uiStore.replaceSearchCriteria(pathCriteria(nodeData.path));
      },
      [nodeData, uiStore],
    );

    const { handleDragEnter, handleDragLeave, handleDrop } = useFileDropHandling(
      nodeData.id,
      nodeData.path,
      expansion,
      treeData.setExpansion,
    );

    const isSearched = uiStore.searchCriteriaList.some(
      (val) => (val as ClientStringSearchCriteria<IFile>).value === pathAsSearchPath(nodeData.path),
    );

    return (
      <div
        className="tree-content-label"
        onContextMenu={handleContextMenu}
        onDragEnter={handleDragEnter}
        onDrop={handleDrop}
        onDragLeave={handleDragLeave}
      >
        {nodeData.isInitialized
          ? expansion[nodeData.id]
            ? IconSet.FOLDER_OPEN
            : IconSet.FOLDER_CLOSE
          : IconSet.LOADING}
        <div>{nodeData.name}</div>
        {nodeData.isBroken ? (
          <span onClick={() => uiStore.openLocationRecovery(nodeData.id)}>{IconSet.WARNING}</span>
        ) : (
          <button onClick={handleClick} className="btn btn-icon" aria-hidden={!isSearched}>
            {isSearched ? IconSet.SEARCH : IconSet.ADD}
          </button>
        )}
      </div>
    );
  },
);

const SubLocationLabel = (nodeData: any, treeData: any) => (
  <SubLocation nodeData={nodeData} treeData={treeData} />
);

const mapDirectory = (dir: ClientSubLocation): ITreeItem => ({
  id: dir.path,
  label: SubLocationLabel,
  nodeData: dir,
  children: dir.subLocations.map(mapDirectory),
  isExpanded,
});

const LocationLabel = (nodeData: any, treeData: any) => (
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

  useEffect(() => {
    autorun(() => {
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
  }, [locationStore.locationList]);

  useEffect(() => LocationTreeItemRevealer.instance.initialize(setExpansion, locationStore), [
    locationStore,
  ]);

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

const LocationsPanel = observer(() => {
  const { locationStore } = useStore();
  const [contextState, { show, hide }] = useContextMenu();

  const [creatableLocation, setCreatableLocation] = useState<ClientLocation>();
  const [deletableLocation, setDeletableLocation] = useState<ClientLocation>();
  const [excludableSubLocation, setExcludableSubLocation] = useState<ClientSubLocation>();
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
        timeout: 5000,
      });
      return;
    }

    // Check if the new location is a parent-directory of an existing location
    const childDir = locationStore.exists((dir) => dir.path.includes(path));
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

  return (
    <div
      className={`section ${isEmpty || isDropping ? 'attention' : ''} ${isDropping ? 'info' : ''}`}
    >
      <header>
        <h2 onClick={() => setCollapsed(!isCollapsed)}>Locations</h2>
        <Toolbar controls="location-list">
          {locationStore.locationList.length > 0 && (
            <ToolbarButton
              showLabel="never"
              icon={IconSet.RELOAD}
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
            showLabel="never"
            icon={IconSet.PLUS}
            text="New Location"
            onClick={handleChooseWatchedDir}
            tooltip={Tooltip.Location}
          />
        </Toolbar>
      </header>
      <Collapse open={!isCollapsed}>
        <LocationsTree
          showContextMenu={show}
          onDelete={setDeletableLocation}
          onExclude={setExcludableSubLocation}
        />
        {isEmpty && <i>Click + to choose a Location</i>}
      </Collapse>
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
    </div>
  );
});

export default LocationsPanel;
