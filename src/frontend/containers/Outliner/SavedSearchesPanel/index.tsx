import { observable, runInAction } from 'mobx';
import { observer } from 'mobx-react-lite';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { generateId } from 'src/entities/ID';
import { CustomKeyDict, FileSearchCriteria } from 'src/entities/SearchCriteria';
import { ClientFileSearchItem } from 'src/entities/SearchItem';
import { SavedSearchRemoval } from 'src/frontend/components/RemovalAlert';
import { useStore } from 'src/frontend/contexts/StoreContext';
import {
  DnDSearchType,
  SearchDnDProvider,
  useSearchDnD,
} from 'src/frontend/contexts/TagDnDContext';
import { useAutorun } from 'src/frontend/hooks/mobx';
import { IconSet } from 'widgets/Icons';
import { Menu, MenuItem, useContextMenu } from 'widgets/menus';
import MultiSplitPane, { MultiSplitPaneProps } from 'widgets/MultiSplit/MultiSplitPane';
import { Callout } from 'widgets/notifications';
import { Toolbar, ToolbarButton } from 'widgets/Toolbar';
import Tree, { createBranchOnKeyDown, ITreeItem } from 'widgets/Tree';
import SearchItemDialog from '../../AdvancedSearch/SearchItemDialog';
import { IExpansionState } from '../../types';
import { createDragReorderHelper } from '../TreeItemDnD';
import { emptyFunction, triggerContextMenuEvent } from '../utils';

// Tooltip info
const enum Tooltip {
  Create = 'Save the current search as a new saved search',
}

interface ITreeData {
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
      <Menu>
        <MenuItem text="Edit" onClick={() => onEdit(searchItem)} icon={IconSet.EDIT} />
        <MenuItem
          text="Replace with current search"
          onClick={() => onReplace(searchItem)}
          icon={IconSet.REPLACE}
        />
        <MenuItem text="Duplicate" onClick={() => onDuplicate(searchItem)} icon={IconSet.PLUS} />
        <MenuItem text="Delete" onClick={() => onDelete(searchItem)} icon={IconSet.DELETE} />
      </Menu>
    );
  },
);

const DnDHelper = createDragReorderHelper('saved-searches-dnd-preview', DnDSearchType);

const SearchItem = observer(
  ({ nodeData, treeData }: { nodeData: ClientFileSearchItem; treeData: ITreeData }) => {
    const rootStore = useStore();
    const { uiStore, searchStore } = rootStore;
    const { edit: onEdit, duplicate: onDuplicate, delete: onDelete, replace: onReplace } = treeData;
    const show = useContextMenu();
    const handleContextMenu = useCallback(
      (event: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
        show(
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
      [show, nodeData, onEdit, onDelete, onDuplicate, onReplace],
    );

    const handleClick = useCallback(
      (e: React.MouseEvent) => {
        runInAction(() => {
          if (!e.ctrlKey) {
            uiStore.replaceSearchCriterias(nodeData.criteria.toJSON());
            if (uiStore.searchMatchAny !== nodeData.matchAny) {
              uiStore.toggleSearchMatchAny();
            }
          } else {
            uiStore.toggleSearchCriterias(nodeData.criteria.toJSON());
          }
        });
      },
      [nodeData.criteria, nodeData.matchAny, uiStore],
    );

    const handleEdit = useCallback(
      (e: React.MouseEvent<HTMLButtonElement>) => {
        e.preventDefault();
        e.stopPropagation();
        treeData.edit(nodeData);
      },
      [nodeData, treeData],
    );

    const dndData = useSearchDnD();
    const handleDragStart = useCallback(
      (event: React.DragEvent<HTMLDivElement>) =>
        runInAction(() =>
          DnDHelper.onDragStart(event, nodeData.name, uiStore.theme, dndData, nodeData),
        ),
      [dndData, nodeData, uiStore],
    );

    const handleDragOver = useCallback(
      (event: React.DragEvent<HTMLDivElement>) => DnDHelper.onDragOver(event, dndData, false),
      [dndData],
    );

    const handleDragLeave = useCallback(
      (event: React.DragEvent<HTMLDivElement>) => DnDHelper.onDragLeave(event),
      [],
    );

    const handleDrop = useCallback(
      (event: React.DragEvent<HTMLDivElement>) => {
        runInAction(() => {
          if (!dndData.source) {
            return;
          }
          const relativeMovePos = DnDHelper.onDrop(event);

          if (relativeMovePos === 'middle') {
            // not possible for searches, no middle position allowed
          } else {
            let target = nodeData;
            if (relativeMovePos === -1) {
              const index = searchStore.searchList.indexOf(target) - 1;
              if (index >= 0) {
                target = searchStore.searchList[index];
              }
            }
            searchStore.reorder(dndData.source, target);
          }
        });
      },
      [dndData.source, nodeData, searchStore],
    );

    return (
      <div
        className="tree-content-label"
        onClick={handleClick}
        draggable
        onContextMenu={handleContextMenu}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
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

    const handleClick = useCallback(
      (e: React.MouseEvent) => {
        runInAction(() => {
          if (!e.ctrlKey) {
            uiStore.replaceSearchCriterias([nodeData]);
          } else {
            uiStore.toggleSearchCriterias([nodeData]);
          }
        });
      },
      [nodeData, uiStore],
    );

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
  onEdit: (search: ClientFileSearchItem) => void;
  onDelete: (search: ClientFileSearchItem) => void;
  onDuplicate: (search: ClientFileSearchItem) => void;
  onReplace: (search: ClientFileSearchItem) => void;
}

const SavedSearchesList = ({ onDelete, onEdit, onDuplicate, onReplace }: ISearchTreeProps) => {
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
    }),
    [expansion, onDelete, onDuplicate, onEdit, onReplace],
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

const SavedSearchesPanel = observer((props: Partial<MultiSplitPaneProps>) => {
  const rootStore = useStore();
  const { searchStore, uiStore } = rootStore;
  const { t } = useTranslation();

  const isEmpty = searchStore.searchList.length === 0;

  const [editableSearch, setEditableSearch] = useState<ClientFileSearchItem>();
  const [deletableSearch, setDeletableSearch] = useState<ClientFileSearchItem>();

  const saveCurrentSearch = async () => {
    const savedSearch = await searchStore.create(
      new ClientFileSearchItem(
        generateId(),
        uiStore.searchCriteriaList.map((c) => c.getLabel(CustomKeyDict, rootStore)).join(', ') ||
          'New search',
        uiStore.searchCriteriaList.map((c) => c.serialize(rootStore)),
        uiStore.searchMatchAny,
        searchStore.searchList.length,
      ),
    );
    setEditableSearch(savedSearch);
  };

  const data = useRef(observable({ source: undefined }));

  return (
    <SearchDnDProvider value={data.current}>
      <MultiSplitPane
        id="saved-searches"
        title={t('savedSearches')}
        headerToolbar={
          <Toolbar controls="saved-searches-list" isCompact>
            <ToolbarButton
              icon={IconSet.PLUS}
              text="Save current search"
              onClick={saveCurrentSearch}
              tooltip={Tooltip.Create}
            />
          </Toolbar>
        }
        {...props}
      >
        <SavedSearchesList
          onEdit={setEditableSearch}
          onDelete={setDeletableSearch}
          onDuplicate={searchStore.duplicate}
          onReplace={searchStore.replaceWithActiveSearch}
        />
        {isEmpty && (
          <Callout icon={IconSet.INFO}>Click + to save your current search criteria.</Callout>
        )}

        {editableSearch && (
          <SearchItemDialog
            searchItem={editableSearch}
            onClose={() => setEditableSearch(undefined)}
          />
        )}
        {deletableSearch && (
          <SavedSearchRemoval
            object={deletableSearch}
            onClose={() => setDeletableSearch(undefined)}
          />
        )}
      </MultiSplitPane>
    </SearchDnDProvider>
  );
});

export default SavedSearchesPanel;
