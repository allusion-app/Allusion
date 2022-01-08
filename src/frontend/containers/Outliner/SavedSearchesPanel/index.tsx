import { observer } from 'mobx-react-lite';
import React, { useCallback, useMemo, useState } from 'react';
import { generateId } from 'src/entities/ID';
import { CustomKeyDict, FileSearchCriteria } from 'src/entities/SearchCriteria';
import { ClientFileSearchItem } from 'src/entities/SearchItem';
import { Collapse } from 'src/frontend/components/Collapse';
import { useStore } from 'src/frontend/contexts/StoreContext';
import { useAutorun } from 'src/frontend/hooks/mobx';
import useContextMenu from 'src/frontend/hooks/useContextMenu';
import { emptyFunction, triggerContextMenuEvent } from 'src/frontend/utils';
import { IconSet } from 'widgets/Icons';
import { ContextMenu, Menu } from 'widgets/menus';
import { Callout } from 'widgets/notifications';
import { Toolbar, ToolbarButton } from 'widgets/Toolbar';
import Tree, { createBranchOnKeyDown, ITreeItem } from 'widgets/Tree';
import SearchItemDialog from '../../AdvancedSearch/SearchItemDialog';
import { IExpansionState } from '../../types';

// Tooltip info
const enum Tooltip {
  Create = 'Save the current search as a new saved search',
}

interface ITreeData {
  showContextMenu: (x: number, y: number, menu: JSX.Element) => void;
  expansion: IExpansionState;
  setExpansion: React.Dispatch<IExpansionState>;
  delete: (location: ClientFileSearchItem) => void;
  edit: (location: ClientFileSearchItem) => void;
}

const toggleExpansion = (nodeData: ClientFileSearchItem, treeData: ITreeData) => {
  const { expansion, setExpansion } = treeData;
  const id = nodeData.id;
  setExpansion({ ...expansion, [id]: !expansion[id] });
};

const isExpanded = (nodeData: ClientFileSearchItem, treeData: ITreeData) =>
  treeData.expansion[nodeData.id];

const customKeys = (
  search: (crits: FileSearchCriteria[], searchMatchAny: boolean) => void,
  event: React.KeyboardEvent<HTMLLIElement>,
  nodeData: ClientFileSearchItem | FileSearchCriteria,
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
      if (nodeData instanceof ClientFileSearchItem) {
        search(nodeData.criteria, nodeData.matchAny);
      } else {
        // TODO: ctrl/shift adds onto search
        search([nodeData], false);
      }
      break;

    case 'Delete':
      if (nodeData instanceof ClientFileSearchItem) {
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

const SearchCriteriaLabel = ({ nodeData, treeData }: { nodeData: any; treeData: any }) => (
  <SearchItemCriteria nodeData={nodeData} treeData={treeData} />
);

const SearchItemLabel = ({ nodeData, treeData }: { nodeData: any; treeData: any }) => (
  <SearchItem nodeData={nodeData} treeData={treeData} />
);

const mapItem = (item: ClientFileSearchItem): ITreeItem => ({
  id: item.id,
  label: SearchItemLabel,
  nodeData: item,
  children: item.criteria.map((c, i) => ({
    id: `${item.id}-${i}`,
    nodeData: c,
    label: SearchCriteriaLabel,
    children: [],
    isExpanded: () => false,
  })),
  isExpanded,
});

const SearchItem = observer(
  ({ nodeData, treeData }: { nodeData: ClientFileSearchItem; treeData: ITreeData }) => {
    const { uiStore } = useStore();
    // const { showContextMenu, expansion, delete: onDelete } = treeData;
    // const handleContextMenu = useCallback(
    //   (event: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    //     showContextMenu(
    //       event.clientX,
    //       event.clientY,
    //       <LocationTreeContextMenu
    //         location={nodeData}
    //         onDelete={onDelete}
    //         onExclude={treeData.exclude}
    //       />,
    //     );
    //   },
    //   [showContextMenu, nodeData, onDelete, treeData.exclude],
    // );

    const handleClick = useCallback(() => {
      uiStore.replaceSearchCriterias(nodeData.criteria);
      if (uiStore.searchMatchAny !== nodeData.matchAny) {
        uiStore.toggleSearchMatchAny();
      }
    }, [nodeData.criteria, nodeData.matchAny, uiStore]);

    const handleEdit = useCallback(
      (e: React.MouseEvent<HTMLButtonElement>) => {
        e.preventDefault();
        e.stopPropagation();
        treeData.edit(nodeData);
      },
      [nodeData, treeData],
    );

    return (
      <div
        className="tree-content-label"
        onClick={handleClick}
        // TODO: Context menu
        // onContextMenu={handleContextMenu}
      >
        {IconSet.SEARCH}
        <div className="label-text">{nodeData.name}</div>

        <button className="btn btn-icon" onClick={handleEdit}>
          {IconSet.EDIT}
        </button>
      </div>
    );
  },
);

const SearchItemCriteria = observer(
  ({ nodeData }: { nodeData: FileSearchCriteria; treeData: ITreeData }) => {
    const rootStore = useStore();
    const { uiStore } = rootStore;
    // const { showContextMenu, expansion, delete: onDelete } = treeData;
    // const handleContextMenu = useCallback(
    //   (event: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    //     showContextMenu(
    //       event.clientX,
    //       event.clientY,
    //       <LocationTreeContextMenu
    //         location={nodeData}
    //         onDelete={onDelete}
    //         onExclude={treeData.exclude}
    //       />,
    //     );
    //   },
    //   [showContextMenu, nodeData, onDelete, treeData.exclude],
    // );

    const handleClick = useCallback(() => {
      uiStore.replaceSearchCriterias([nodeData]);
    }, [nodeData, uiStore]);

    const label = nodeData.getLabel(CustomKeyDict, rootStore);

    return (
      <div
        className="tree-content-label"
        onClick={handleClick}
        // onContextMenu={handleContextMenu}
      >
        {nodeData.valueType === 'array'
          ? IconSet.TAG
          : nodeData.valueType === 'string'
          ? IconSet.FILTER_NAME_DOWN
          : nodeData.valueType === 'number'
          ? IconSet.FILTER_FILTER_DOWN
          : IconSet.FILTER_DATE}
        <div className="label-text" data-tooltip={label}>
          {label}
        </div>
      </div>
    );
  },
);

interface ISearchTreeProps {
  showContextMenu: (x: number, y: number, menu: JSX.Element) => void;
  onEdit: (loc: ClientFileSearchItem) => void;
  onDelete: (loc: ClientFileSearchItem) => void;
}

const SavedSearchesList = ({ onDelete, onEdit, showContextMenu }: ISearchTreeProps) => {
  const rootStore = useStore();
  const { searchStore, uiStore } = rootStore;
  const [expansion, setExpansion] = useState<IExpansionState>({});
  const treeData: ITreeData = useMemo<ITreeData>(
    () => ({
      expansion,
      setExpansion,
      delete: onDelete,
      edit: onEdit,
      showContextMenu,
    }),
    [expansion, onDelete, onEdit, showContextMenu],
  );
  const [branches, setBranches] = useState<ITreeItem[]>([]);

  const handleBranchKeyDown = useCallback(
    (
      event: React.KeyboardEvent<HTMLLIElement>,
      nodeData: ClientFileSearchItem | FileSearchCriteria,
      treeData: ITreeData,
    ) =>
      createBranchOnKeyDown(
        event,
        nodeData,
        treeData,
        isExpanded,
        emptyFunction,
        toggleExpansion,
        customKeys.bind(null, (crits: FileSearchCriteria[], searchMatchAny: boolean) => {
          uiStore.replaceSearchCriterias(crits);
          if (uiStore.searchMatchAny !== searchMatchAny) {
            uiStore.toggleSearchMatchAny();
          }
        }),
      ),
    [uiStore],
  );

  useAutorun(() => {
    setBranches(searchStore.searchList.map(mapItem));
  });

  // TODO: we probably need drag n drop re-ordering here too, god damnit
  return (
    <Tree
      id="saved-searches-list"
      multiSelect
      children={branches}
      treeData={treeData}
      toggleExpansion={toggleExpansion}
      onBranchKeyDown={handleBranchKeyDown}
      onLeafKeyDown={emptyFunction}
    />
  );
};

const SavedSearchesPanel = observer(() => {
  const rootStore = useStore();
  const { searchStore, uiStore } = rootStore;
  const [contextState, { show, hide }] = useContextMenu();

  const isEmpty = searchStore.searchList.length === 0;

  const [editableSearch, setEditableSearch] = useState<ClientFileSearchItem>();
  const [deletableSearch, setDeletableSearch] = useState<ClientFileSearchItem>();
  const [isCollapsed, setCollapsed] = useState(false);

  const saveCurrentSearch = () =>
    searchStore.create(
      new ClientFileSearchItem(
        generateId(),
        'New search',
        uiStore.searchCriteriaList.toJSON().map((c) => c.serialize(rootStore)),
        uiStore.searchMatchAny,
      ),
    );

  return (
    <div className={'section'}>
      <header>
        <h2 onClick={() => setCollapsed(!isCollapsed)}>Saved Searches</h2>
        <Toolbar controls="saved-searches-list" isCompact>
          <ToolbarButton
            icon={IconSet.ADD}
            text="Save current search"
            onClick={saveCurrentSearch}
            tooltip={Tooltip.Create}
          />
        </Toolbar>
      </header>
      <Collapse open={!isCollapsed}>
        <SavedSearchesList
          showContextMenu={show}
          onEdit={setEditableSearch}
          onDelete={setDeletableSearch}
        />
        {isEmpty && (
          <Callout icon={IconSet.INFO}>Click + to save your current search criteria.</Callout>
        )}
      </Collapse>

      {editableSearch && (
        <SearchItemDialog
          searchItem={editableSearch}
          onClose={() => setEditableSearch(undefined)}
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

export default SavedSearchesPanel;
