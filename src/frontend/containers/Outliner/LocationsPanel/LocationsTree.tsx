import React, { useCallback, useState, useEffect, useMemo, useRef, memo } from 'react';
import { observer } from 'mobx-react-lite';
import { autorun, flow } from 'mobx';
import SysPath from 'path';

import { useStore } from 'src/frontend/contexts/StoreContext';
import { ClientLocation, getDirectoryTree, IDirectoryTreeItem } from 'src/entities/Location';
import { CustomKeyDict, ClientStringSearchCriteria } from 'src/entities/SearchCriteria';
import { IFile } from 'src/entities/File';
import { IconSet, Tree } from 'widgets';
import { createBranchOnKeyDown, createLeafOnKeyDown, ITreeItem } from 'widgets/Tree';
import { AppToaster } from 'src/frontend/components/Toaster';
import { onDragOver, useFileDrop } from './useFileDrop';
import { DirectoryMenu, LocationTreeContextMenu } from './ContextMenu';
import LocationsTreeStateProvider, {
  LocationsTreeState,
  useLocationsTreeState,
} from './LocationsTreeState';
import { Toolbar, ToolbarButton } from 'widgets/Toolbar';
import { RendererMessenger } from 'src/Messaging';
import { Collapse } from 'src/frontend/components/Collapse';
import LocationRecovery from './LocationRecovery';
import { LocationRemoval } from 'src/frontend/components/RemovalAlert';
import useContextMenu from 'src/frontend/hooks/useContextMenu';
import { Menu, ContextMenu } from 'widgets/menus';

const LocationsTree = observer(() => {
  const [contextState, { show, hide }] = useContextMenu();
  const { locationStore } = useStore();
  const state = useRef(new LocationsTreeState()).current;
  const [isOpen, setIsOpen] = useState(true);

  const isEmpty = locationStore.locationList.length === 0;

  return (
    <LocationsTreeStateProvider value={state}>
      <Header setIsOpen={setIsOpen} />
      <Collapse open={isOpen}>
        {isEmpty ? <i>Click + to choose a Location</i> : <Content show={show} />}
      </Collapse>

      {state.recoverable && <LocationRecovery location={state.recoverable} />}

      {state.deletable && (
        <LocationRemoval object={state.deletable} onClose={state.abortDeletion} />
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
    </LocationsTreeStateProvider>
  );
});

export default LocationsTree;

interface HeaderProps {
  setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

// Tooltip info
const enum Tooltip {
  Location = 'Add new Location',
  Refresh = 'Refresh directories',
}

const Header = memo(function Header({ setIsOpen }: HeaderProps) {
  const state = useLocationsTreeState();
  const { locationStore } = useStore();

  // TODO: Offer option to replace child location(s) with the parent loc, so no data of imported images is lost
  const handleChooseWatchedDir = flow(function* () {
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
  });

  return (
    <header>
      <h2 onClick={() => setIsOpen((v) => !v)}>Locations</h2>
      <Toolbar controls="location-list">
        <ToolbarButton
          showLabel="never"
          icon={IconSet.RELOAD}
          text="Refresh"
          onClick={state.reload}
          tooltip={Tooltip.Refresh}
        />
        <ToolbarButton
          showLabel="never"
          icon={IconSet.PLUS}
          text="New Location"
          onClick={handleChooseWatchedDir}
          tooltip={Tooltip.Location}
        />
      </Toolbar>
    </header>
  );
});

interface ContentProps {
  show: (x: number, y: number, menu: JSX.Element) => void;
}

const Content = observer(({ show }: ContentProps) => {
  const { locationStore, uiStore } = useStore();
  const state = useLocationsTreeState();
  const treeData: ITreeData = useMemo(
    () => ({
      state,
      show,
    }),
    [show, state],
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
  ).current;

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
  ).current;

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
  }, [locationStore.locationList, state.lastUpdated]);

  return (
    <Tree
      id="location-list"
      multiSelect
      children={branches}
      treeData={treeData}
      toggleExpansion={toggleExpansion}
      onBranchKeyDown={handleBranchKeyDown}
      onLeafKeyDown={handleLeafOnKeyDown}
    />
  );
});

interface ITreeData {
  state: LocationsTreeState;
  show: (x: number, y: number, menu: JSX.Element) => void;
}

const toggleExpansion = (nodeData: ClientLocation | IDirectoryTreeItem, treeData: ITreeData) => {
  const id = nodeData instanceof ClientLocation ? nodeData.id : nodeData.fullPath;
  treeData.state.toggleExpansion(id);
};

const isExpanded = (nodeData: ClientLocation | IDirectoryTreeItem, treeData: ITreeData) => {
  const id = nodeData instanceof ClientLocation ? nodeData.id : nodeData.fullPath;
  return treeData.state.isExpanded(id);
};

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
  new ClientStringSearchCriteria<IFile>(
    'absolutePath',
    // Add an additional / or \ in order to enforce files only in the specific directory are found, not in those starting with same name
    `${path}${SysPath.sep}`,
    'startsWith',
    CustomKeyDict,
  );

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
        treeData.state.tryDeletion(nodeData);
      }
      break;

    case 'ContextMenu':
      triggerContextMenuEvent(event);
      break;

    default:
      break;
  }
};

const SubLocation = observer(
  ({ nodeData, treeData }: { nodeData: IDirectoryTreeItem; treeData: ITreeData }) => {
    const { uiStore } = useStore();
    const state = useLocationsTreeState();
    const { show } = treeData;
    const handleContextMenu = (e: React.MouseEvent) =>
      show(e.clientX, e.clientY, <DirectoryMenu path={nodeData.fullPath} />);

    const handleClick = (event: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
      // TODO: Mark searched nodes as selected?
      event.ctrlKey
        ? uiStore.addSearchCriteria(pathCriteria(nodeData.fullPath))
        : uiStore.replaceSearchCriteria(pathCriteria(nodeData.fullPath));
    };

    const { handleDragEnter, handleDragLeave, handleDrop } = useFileDrop(
      nodeData.fullPath,
      nodeData.fullPath,
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
        {state.expansion.has(nodeData.fullPath) ? IconSet.FOLDER_OPEN : IconSet.FOLDER_CLOSE}
        {nodeData.name}
      </div>
    );
  },
);

const Location = observer(
  ({ nodeData, treeData }: { nodeData: ClientLocation; treeData: ITreeData }) => {
    const { uiStore } = useStore();
    const state = useLocationsTreeState();
    const { show } = treeData;
    const handleContextMenu = useCallback(
      (event: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
        show(event.clientX, event.clientY, <LocationTreeContextMenu location={nodeData} />);
      },
      [nodeData, show],
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

    const { handleDragEnter, handleDragLeave, handleDrop } = useFileDrop(
      nodeData.id,
      nodeData.path,
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
        {state.expansion.has(nodeData.id) ? IconSet.FOLDER_OPEN : IconSet.FOLDER_CLOSE}
        <div>{nodeData.name}</div>
        {nodeData.isBroken && (
          <span onClick={() => state.tryRecovery(nodeData)}>{IconSet.WARNING}</span>
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
