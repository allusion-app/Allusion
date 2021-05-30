import React, { useCallback, useState, useEffect, useMemo, useRef } from 'react';
import { observer } from 'mobx-react-lite';
import { autorun } from 'mobx';

import { useStore } from 'src/frontend/contexts/StoreContext';
import { ClientLocation, getDirectoryTree, IDirectoryTreeItem } from 'src/entities/Location';
import { ClientStringSearchCriteria } from 'src/entities/SearchCriteria';
import { IFile } from 'src/entities/File';
import { IconSet, Tree } from 'widgets';
import { createBranchOnKeyDown, createLeafOnKeyDown, ITreeItem } from 'widgets/Tree';
import { CustomKeyDict } from '../../types';
import { AppToaster } from 'src/frontend/components/Toaster';
import { handleDragLeave, isAcceptableType, onDragOver, storeDroppedImage } from './dnd';
import { DnDAttribute } from 'src/frontend/contexts/TagDnDContext';
import { ID } from 'src/entities/ID';
import { HOVER_TIME_TO_EXPAND } from '..';
import { DirectoryMenu, LocationTreeContextMenu } from './ContextMenu';

interface LocationTreeProps {
  showContextMenu: (x: number, y: number, menu: JSX.Element) => void;
  onDelete: (loc: ClientLocation) => void;
  reloadLocationHierarchyTrigger?: Date;
}

const LocationsTree = (props: LocationTreeProps) => {
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

export default LocationsTree;

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
