import React, { useContext, useCallback, useState, useEffect, useMemo, useRef } from 'react';
import { shell } from 'electron';
import { observer } from 'mobx-react-lite';
import { autorun, flow } from 'mobx';

import { RendererMessenger } from 'src/Messaging';
import { useStore } from 'src/frontend/contexts/StoreContext';
import useContextMenu from 'src/frontend/hooks/useContextMenu';
import { ClientLocation, getDirectoryTree, IDirectoryTreeItem } from 'src/entities/Location';
import { ClientStringSearchCriteria } from 'src/entities/SearchCriteria';
import { IFile } from 'src/entities/File';
import { IconSet, Tree } from 'widgets';
import { Toolbar, ToolbarButton, Menu, MenuItem, ContextMenu, MenuDivider } from 'widgets/menus';
import { createBranchOnKeyDown, createLeafOnKeyDown, ITreeItem } from 'widgets/Tree';
import { CustomKeyDict } from '../../types';
import LocationRecoveryDialog from './LocationRecoveryDialog';
import { LocationRemoval } from 'src/frontend/components/RemovalAlert';
import { Collapse } from 'src/frontend/components/Collapse';
import { AppToaster } from 'src/frontend/components/Toaster';
import { handleDragLeave, isAcceptableType, onDragOver, storeDroppedImage } from './dnd';
import { DnDAttribute } from 'src/frontend/contexts/TagDnDContext';
import DropContext from 'src/frontend/contexts/DropContext';
import { ID } from 'src/entities/ID';

// Tooltip info
const enum Tooltip {
  Location = 'Add new Location',
  Refresh = 'Refresh directories',
}

interface ITreeData {
  showContextMenu: (x: number, y: number, menu: JSX.Element) => void;
  expansion: Set<ID>;
  setExpansion: React.Dispatch<React.SetStateAction<Set<string>>>;
  delete: (location: ClientLocation) => void;
}

const toggleExpansion = (nodeData: ClientLocation | IDirectoryTreeItem, treeData: ITreeData) => {
  const id = nodeData instanceof ClientLocation ? nodeData.id : nodeData.fullPath;
  treeData.setExpansion((expansion: Set<ID>) => {
    if (!expansion.delete(id)) {
      expansion.add(id);
    }
    return new Set(expansion);
  });
};

const isExpanded = (nodeData: ClientLocation | IDirectoryTreeItem, treeData: ITreeData) =>
  treeData.expansion.has(nodeData instanceof ClientLocation ? nodeData.id : nodeData.fullPath);

// eslint-disable-next-line @typescript-eslint/no-empty-function
const emptyFunction = () => {};

const triggerContextMenuEvent = (event: React.KeyboardEvent<HTMLLIElement>) => {
  const element = event.currentTarget.querySelector('.tree-content-label');
  if (element) {
    event.stopPropagation();
    const rect = element.getBoundingClientRect();
    element.dispatchEvent(
      new MouseEvent('contextmenu', {
        clientX: rect.right,
        clientY: rect.top,
        bubbles: true,
        cancelable: true,
      }),
    );
  }
};

const pathCriteria = (path: string) =>
  new ClientStringSearchCriteria<IFile>('absolutePath', path, 'startsWith', CustomKeyDict);

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

interface IContextMenuProps {
  location: ClientLocation;
  onDelete: (location: ClientLocation) => void;
}

const LocationTreeContextMenu = observer(({ location, onDelete }: IContextMenuProps) => {
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

export const HOVER_TIME_TO_EXPAND = 600;

const useFileDropHandling = (
  expansionId: string,
  fullPath: string,
  expansion: Set<ID>,
  setExpansion: React.Dispatch<React.SetStateAction<Set<string>>>,
) => {
  // Don't expand immediately, only after hovering over it for a second or so
  const [expandTimeoutId, setExpandTimeoutId] = useState<number>();
  const expandDelayed = useCallback(() => {
    if (expandTimeoutId) clearTimeout(expandTimeoutId);
    const t = window.setTimeout(() => {
      setExpansion((expansion) => {
        return new Set(expansion.add(expansionId));
      });
    }, HOVER_TIME_TO_EXPAND);
    setExpandTimeoutId(t);
  }, [expandTimeoutId, expansionId, setExpansion]);

  const handleDragEnter = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.stopPropagation();
      event.preventDefault();
      const canDrop = onDragOver(event);
      if (canDrop && !expansion.has(expansionId)) {
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
  nodeData: IDirectoryTreeItem;
  treeData: ITreeData;
}) => {
  const { uiStore } = useStore();
  const { showContextMenu, expansion, setExpansion } = treeData;
  const handleContextMenu = useCallback(
    (e: React.MouseEvent) =>
      showContextMenu(e.clientX, e.clientY, <DirectoryMenu path={nodeData.fullPath} />),
    [nodeData, showContextMenu],
  );

  const handleClick = useCallback(
    (event: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
      // TODO: Mark searched nodes as selected?
      event.ctrlKey
        ? uiStore.addSearchCriteria(pathCriteria(nodeData.fullPath))
        : uiStore.replaceSearchCriteria(pathCriteria(nodeData.fullPath));
    },
    [nodeData.fullPath, uiStore],
  );

  const { handleDragEnter, handleDragLeave, handleDrop } = useFileDropHandling(
    nodeData.fullPath,
    nodeData.fullPath,
    expansion,
    setExpansion,
  );

  return (
    <div
      className="tree-content-label"
      onClick={handleClick}
      onContextMenu={handleContextMenu}
      onDragEnter={handleDragEnter}
      onDrop={handleDrop}
      onDragLeave={handleDragLeave}
      // Note: onDragOver is not needed here, but need to preventDefault() for onDrop to work 🙃
      onDragOver={onDragOver}
    >
      {expansion.has(nodeData.fullPath) ? IconSet.FOLDER_OPEN : IconSet.FOLDER_CLOSE}
      {nodeData.name}
    </div>
  );
};

const Location = observer(
  ({ nodeData, treeData }: { nodeData: ClientLocation; treeData: ITreeData }) => {
    const { uiStore } = useStore();
    const { showContextMenu, expansion, delete: onDelete, setExpansion } = treeData;
    const handleContextMenu = useCallback(
      (event: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
        console.log(event.clientX, event.clientY);
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
          ? uiStore.addSearchCriteria(pathCriteria(nodeData.path))
          : uiStore.replaceSearchCriteria(pathCriteria(nodeData.path));
      },
      [nodeData, uiStore],
    );

    const { handleDragEnter, handleDragLeave, handleDrop } = useFileDropHandling(
      nodeData.id,
      nodeData.path,
      expansion,
      setExpansion,
    );

    return (
      <div
        className="tree-content-label"
        onClick={handleClick}
        onContextMenu={handleContextMenu}
        onDragEnter={handleDragEnter}
        onDrop={handleDrop}
        onDragLeave={handleDragLeave}
      >
        {expansion.has(nodeData.id) ? IconSet.FOLDER_OPEN : IconSet.FOLDER_CLOSE}
        <div>{nodeData.name}</div>
        {nodeData.isBroken && (
          <span onClick={() => uiStore.openLocationRecovery(nodeData.id)}>{IconSet.WARNING}</span>
        )}
      </div>
    );
  },
);

const SubLocationLabel = (nodeData: IDirectoryTreeItem, treeData: ITreeData) => (
  <SubLocation nodeData={nodeData} treeData={treeData} />
);

const mapDirectory = (dir: IDirectoryTreeItem): ITreeItem => ({
  id: dir.fullPath,
  label: SubLocationLabel,
  nodeData: dir,
  children: dir.children.map(mapDirectory),
  isExpanded,
});

const LocationLabel = (nodeData: ClientLocation, treeData: ITreeData) => (
  <Location nodeData={nodeData} treeData={treeData} />
);

interface ILocationTreeProps {
  showContextMenu: (x: number, y: number, menu: JSX.Element) => void;
  onDelete: (loc: ClientLocation) => void;
  reloadLocationHierarchyTrigger?: Date;
}

const LocationsTree = (props: ILocationTreeProps) => {
  const { onDelete, showContextMenu, reloadLocationHierarchyTrigger } = props;
  const { locationStore, uiStore } = useStore();
  const [expansion, setExpansion] = useState<Set<ID>>(new Set());
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

  const handleBranchKeyDown = useRef(
    (event: React.KeyboardEvent<HTMLLIElement>, nodeData: ClientLocation, treeData: ITreeData) =>
      createBranchOnKeyDown(
        event,
        nodeData,
        treeData,
        isExpanded,
        emptyFunction,
        toggleExpansion,
        customKeys.bind(null, (path: string) => uiStore.replaceSearchCriteria(pathCriteria(path))),
      ),
  );

  const handleLeafOnKeyDown = useRef(
    (
      event: React.KeyboardEvent<HTMLLIElement>,
      nodeData: IDirectoryTreeItem,
      treeData: ITreeData,
    ) =>
      createLeafOnKeyDown(
        event,
        nodeData,
        treeData,
        emptyFunction,
        customKeys.bind(null, (path: string) => uiStore.replaceSearchCriteria(pathCriteria(path))),
      ),
  );

  useEffect(() => {
    // Prevents updating state when component will be unmounted!
    let isMounted = true;
    const dispose = autorun(async () => {
      const value = await Promise.all(
        locationStore.locationList.map(async (location) => {
          let children: ITreeItem[];
          try {
            children = (await getDirectoryTree(location.path)).map(mapDirectory);
          } catch (error) {
            children = [];
            console.error('Could not create directory tree', error);
          }
          return {
            id: location.id,
            label: LocationLabel,
            children,
            nodeData: location,
            isExpanded,
          };
        }),
      );
      if (isMounted) {
        setBranches(value);
      }
    });

    return () => {
      isMounted = false;
      dispose();
    };
    // TODO: re-run when location (sub)-folder updates: add "lastUpdated" field to location, update when location watcher notices changes?
  }, [locationStore.locationList, reloadLocationHierarchyTrigger]);

  return (
    <Tree
      id="location-list"
      multiSelect
      children={branches}
      treeData={treeData}
      toggleExpansion={toggleExpansion}
      onBranchKeyDown={handleBranchKeyDown.current}
      onLeafKeyDown={handleLeafOnKeyDown.current}
    />
  );
};

const LocationsPanel = observer(() => {
  const { locationStore } = useStore();
  const [contextState, { show, hide }] = useContextMenu();

  const [deletableLocation, setDeletableLocation] = useState<ClientLocation | undefined>(undefined);
  const [isCollapsed, setCollapsed] = useState(false);
  const [reloadLocationHierarchyTrigger, setReloadLocationHierarchyTrigger] = useState(new Date());

  // TODO: Offer option to replace child location(s) with the parent loc, so no data of imported images is lost
  const handleChooseWatchedDir = useRef(
    flow(function* () {
      let path: string;
      try {
        const { filePaths }: { filePaths: string[] } = yield RendererMessenger.openDialog({
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
      const parentDir = locationStore.locationList.some((dir) => path.includes(dir.path));
      if (parentDir) {
        AppToaster.show({
          message: 'You cannot add a location that is a sub-folder of an existing location.',
          timeout: 5000,
        });
        return;
      }

      // Check if the new location is a parent-directory of an existing location
      const childDir = locationStore.locationList.some((dir) => dir.path.includes(path));
      if (childDir) {
        AppToaster.show({
          message: 'You cannot add a location that is a parent-folder of an existing location.',
          timeout: 5000,
        });
        return;
      }

      const location: ClientLocation = yield locationStore.create(path);
      yield locationStore.initLocation(location);
    }),
  );

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
              onClick={() => setReloadLocationHierarchyTrigger(new Date())}
              tooltip={Tooltip.Refresh}
            />
          )}
          <ToolbarButton
            showLabel="never"
            icon={IconSet.PLUS}
            text="New Location"
            onClick={handleChooseWatchedDir.current}
            tooltip={Tooltip.Location}
          />
        </Toolbar>
      </header>
      <Collapse open={!isCollapsed}>
        <LocationsTree
          showContextMenu={show}
          onDelete={setDeletableLocation}
          reloadLocationHierarchyTrigger={reloadLocationHierarchyTrigger}
        />
        {isEmpty && <i>Click + to choose a Location</i>}
      </Collapse>
      <LocationRecoveryDialog />
      {deletableLocation && (
        <LocationRemoval
          object={deletableLocation}
          onClose={() => setDeletableLocation(undefined)}
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
