import React, { useContext, useCallback, useState, useEffect, useMemo } from 'react';
import { shell } from 'electron';
import { observer } from 'mobx-react-lite';
import { autorun } from 'mobx';

import { RendererMessenger } from 'src/Messaging';
import StoreContext from 'src/frontend/contexts/StoreContext';
import UiStore from 'src/frontend/stores/UiStore';
import useContextMenu from 'src/frontend/hooks/useContextMenu';
import { ClientLocation, getDirectoryTree, IDirectoryTreeItem } from 'src/entities/Location';
import { ClientStringSearchCriteria } from 'src/entities/SearchCriteria';
import { IFile } from 'src/entities/File';
import { IconSet, Tree } from 'widgets';
import { Toolbar, ToolbarButton, Menu, MenuItem, ContextMenu, MenuDivider } from 'widgets/menus';
import { createBranchOnKeyDown, ITreeItem } from 'widgets/Tree';
import { CustomKeyDict, IExpansionState } from '../../types';
import LocationRecoveryDialog from './LocationRecoveryDialog';
import { LocationRemoval } from 'src/frontend/components/RemovalAlert';
import { Collapse } from 'src/frontend/components/Collapse';
import { AppToaster } from 'src/frontend/components/Toaster';
import { handleDragLeave, isAcceptableType, onDragOver, storeDroppedImage } from './dnd';
import { DnDAttribute } from 'src/frontend/contexts/TagDnDContext';
import DropContext from 'src/frontend/contexts/DropContext';

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

// FIXME: React broke Element.dispatchevent(). Alternative: Pass show context menu method.
// const triggerContextMenuEvent = (event: React.KeyboardEvent<HTMLLIElement>) => {
//   const element = event.currentTarget.querySelector('.tree-content-label');
//   if (element) {
//     // TODO: Auto-focus the context menu! Do this in the onContextMenu handler.
//     // Why not trigger context menus through `ContextMenu.show()`?
//     event.stopPropagation();
//     element.dispatchEvent(
//       new MouseEvent('contextmenu', {
//         clientX: element.getBoundingClientRect().right,
//         clientY: element.getBoundingClientRect().top,
//       }),
//     );
//   }
// };

const criteria = (path: string) =>
  new ClientStringSearchCriteria<IFile>('absolutePath', path, 'contains', CustomKeyDict);

const customKeys = (
  search: (path: string) => void,
  event: React.KeyboardEvent<HTMLLIElement>,
  nodeData: ClientLocation | IDirectoryTreeItem,
  treeData: ITreeData,
) => {
  switch (event.key) {
    // case 'F10':
    //   if (event.shiftKey) {
    //     triggerContextMenuEvent(event);
    //   }
    //   break;

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

    // case 'ContextMenu':
    //   triggerContextMenuEvent(event);
    //   break;

    default:
      break;
  }
};

type UiStoreProp = { uiStore: UiStore };

const DirectoryMenu = ({ path, uiStore }: { path: string } & UiStoreProp) => {
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

interface IContextMenuProps extends UiStoreProp {
  location: ClientLocation;
  onDelete: (location: ClientLocation) => void;
}

const LocationTreeContextMenu = observer(({ location, onDelete, uiStore }: IContextMenuProps) => {
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
      <DirectoryMenu path={location.path} uiStore={uiStore} />
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
  nodeData: IDirectoryTreeItem;
  treeData: ITreeData;
}) => {
  const { uiStore } = useContext(StoreContext);
  const { showContextMenu, expansion, setExpansion } = treeData;
  const handleContextMenu = useCallback(
    (e: React.MouseEvent) =>
      showContextMenu(
        e.clientX,
        e.clientY,
        <DirectoryMenu path={nodeData.fullPath} uiStore={uiStore} />,
      ),
    [nodeData, showContextMenu, uiStore],
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
          <LocationTreeContextMenu location={nodeData} onDelete={onDelete} uiStore={uiStore} />,
        );
      },
      [nodeData, showContextMenu, onDelete, uiStore],
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

    const { handleDragEnter, handleDragLeave, handleDrop } = useFileDropHandling(
      nodeData.id,
      nodeData.path,
      expansion,
      treeData.setExpansion,
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
        {expansion[nodeData.id] ? IconSet.FOLDER_OPEN : IconSet.FOLDER_CLOSE}
        <div>{nodeData.name}</div>
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

const LocationsTree = observer(({ onDelete, showContextMenu }: ILocationTreeProps) => {
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
  const [branches, setBranches] = useState<ITreeItem[]>(
    locationStore.locationList.map((location) => ({
      id: location.id,
      label: LocationLabel,
      children: [],
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
    const dispose = autorun(() => {
      Promise.all(
        locationStore.locationList.map(async (location) => {
          let children: ITreeItem[];
          try {
            children = (await getDirectoryTree(location.path)).map(mapDirectory);
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

    return () => {
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
});

const LocationsPanel = observer(() => {
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

    locationStore.create(path).then((location) => locationStore.initLocation(location));
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
        <LocationsTree showContextMenu={show} onDelete={setDeletableLocation} />
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
