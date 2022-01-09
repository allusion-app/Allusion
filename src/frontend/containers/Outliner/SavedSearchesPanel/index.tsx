import { runInAction } from 'mobx';
import { observer } from 'mobx-react-lite';
import React, { useCallback, useMemo, useState } from 'react';
import { generateId } from 'src/entities/ID';
import { CustomKeyDict, FileSearchCriteria } from 'src/entities/SearchCriteria';
import { ClientFileSearchItem } from 'src/entities/SearchItem';
import { Collapse } from 'src/frontend/components/Collapse';
import { SavedSearchRemoval } from 'src/frontend/components/RemovalAlert';
import { useStore } from 'src/frontend/contexts/StoreContext';
import { useAutorun } from 'src/frontend/hooks/mobx';
import useContextMenu from 'src/frontend/hooks/useContextMenu';
import { emptyFunction, triggerContextMenuEvent } from 'src/frontend/utils';
import { IconSet } from 'widgets/Icons';
import { ContextMenu, Menu, MenuItem } from 'widgets/menus';
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
  duplicate: (location: ClientFileSearchItem) => void;
  replace: (location: ClientFileSearchItem) => void;
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

interface IContextMenuProps {
  searchItem: ClientFileSearchItem;
  onEdit: (searchItem: ClientFileSearchItem) => void;
  onDuplicate: (searchItem: ClientFileSearchItem) => void;
  onReplace: (searchItem: ClientFileSearchItem) => void;
  onDelete: (searchItem: ClientFileSearchItem) => void;
}

const SearchItemContextMenu = observer(
  ({ searchItem, onDelete, onDuplicate, onReplace, onEdit }: IContextMenuProps) => {
    return (
      <>
        <MenuItem text="Edit" onClick={() => onEdit(searchItem)} icon={IconSet.EDIT} />
        <MenuItem
          text="Replace with current search"
          onClick={() => onReplace(searchItem)}
          icon={IconSet.REPLACE}
        />
        <MenuItem text="Duplicate" onClick={() => onDuplicate(searchItem)} icon={IconSet.PLUS} />
        <MenuItem text="Delete" onClick={() => onDelete(searchItem)} icon={IconSet.DELETE} />
      </>
    );
  },
);

const SearchItem = observer(
  ({ nodeData, treeData }: { nodeData: ClientFileSearchItem; treeData: ITreeData }) => {
    const { uiStore } = useStore();
    const {
      showContextMenu,
      edit: onEdit,
      duplicate: onDuplicate,
      delete: onDelete,
      replace: onReplace,
    } = treeData;
    const handleContextMenu = useCallback(
      (event: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
        showContextMenu(
          event.clientX,
          event.clientY,
          <SearchItemContextMenu
            searchItem={nodeData}
            onEdit={onEdit}
            onDelete={onDelete}
            onDuplicate={onDuplicate}
            onReplace={onReplace}
          />,
        );
      },
      [showContextMenu, nodeData, onEdit, onDelete, onDuplicate, onReplace],
    );

    const handleClick = useCallback(() => {
      uiStore.replaceSearchCriterias(nodeData.criteria);
      if (runInAction(() => uiStore.searchMatchAny !== nodeData.matchAny)) {
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
      <div className="tree-content-label" onClick={handleClick} onContextMenu={handleContextMenu}>
        {/* {IconSet.SEARCH} */}
        {nodeData.matchAny ? IconSet.SEARCH_ANY : IconSet.SEARCH_ALL}
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

    // TODO: context menu for individual criteria of search items?
    // const { showContextMenu, expansion, delete: onDelete } = treeData;
    // const handleContextMenu = useCallback(
    //   (event: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    //     showContextMenu(
    //       event.clientX,
    //       event.clientY,
    //       <SearchItemContextMenu
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
  onEdit: (search: ClientFileSearchItem) => void;
  onDelete: (search: ClientFileSearchItem) => void;
  onDuplicate: (search: ClientFileSearchItem) => void;
  onReplace: (search: ClientFileSearchItem) => void;
}

const SavedSearchesList = ({
  onDelete,
  onEdit,
  onDuplicate,
  onReplace,
  showContextMenu,
}: ISearchTreeProps) => {
  const rootStore = useStore();
  const { searchStore, uiStore } = rootStore;
  const [expansion, setExpansion] = useState<IExpansionState>({});
  const treeData: ITreeData = useMemo<ITreeData>(
    () => ({
      expansion,
      setExpansion,
      delete: onDelete,
      edit: onEdit,
      duplicate: onDuplicate,
      replace: onReplace,
      showContextMenu,
    }),
    [expansion, onDelete, onDuplicate, onEdit, onReplace, showContextMenu],
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
  // what would be a good way to store the order?
  // - Add an `index` field to the search item? will get messy, will need to redistribute all indices in certain cases...
  // - Store order separately in localstorage? Would be easiest, but hacky. Need to keep them in sync
  // same thing applies for Locations
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
        'New search', // TODO: generate name based on criteria?
        uiStore.searchCriteriaList.toJSON().map((c) => c.serialize(rootStore)),
        uiStore.searchMatchAny,
      ),
    );

  return (
    <div className={'section'}>
      <header>
        {/* TODO: maybe call the panel "Bookmarks"? Or "Views"? */}
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
          onDuplicate={searchStore.duplicate}
          onReplace={searchStore.replaceWithActiveSearch}
        />
        {isEmpty && (
          <Callout icon={IconSet.INFO}>Click + to save your current search criteria.</Callout>
        )}
      </Collapse>

      {editableSearch !== undefined && (
        <SearchItemDialog
          searchItem={editableSearch}
          onClose={() => setEditableSearch(undefined)}
        />
      )}
      {deletableSearch !== undefined && (
        <SavedSearchRemoval
          object={deletableSearch}
          onClose={() => setDeletableSearch(undefined)}
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
