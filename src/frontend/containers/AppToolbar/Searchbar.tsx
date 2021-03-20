import React, { useContext } from 'react';
import { action } from 'mobx';
import { observer } from 'mobx-react-lite';

import StoreContext from 'src/frontend/contexts/StoreContext';

const Searchbar = observer(() => {
  const { uiStore, tagStore, fileStore } = useContext(StoreContext);
  const searchCriteriaList = uiStore.searchCriteriaList;

  // Only show quick search bar when all criteria are tags or collections, else
  // show a search bar that opens to the advanced search form
  const isQuickSearch =
    searchCriteriaList.length === 0 ||
    searchCriteriaList.every((crit) => crit.key === 'tags' && crit.operator === 'contains');

  return (
    <div className="searchbar">
      {isQuickSearch ? (
        <QuickSearchList uiStore={uiStore} tagStore={tagStore} fileStore={fileStore} />
      ) : (
        <CriteriaList uiStore={uiStore} tagStore={tagStore} fileStore={fileStore} />
      )}
    </div>
  );
});

export default Searchbar;

import { ClientIDSearchCriteria } from 'src/entities/SearchCriteria';
import { ClientTag } from 'src/entities/Tag';

import UiStore from 'src/frontend/stores/UiStore';
import TagStore from 'src/frontend/stores/TagStore';

import { IconButton, IconSet, Tag } from 'widgets';

import { MultiTagSelector } from 'src/frontend/components/MultiTagSelector';
import FileStore from 'src/frontend/stores/FileStore';

interface ISearchListProps {
  uiStore: UiStore;
  tagStore: TagStore;
  fileStore: FileStore;
}

const QuickSearchList = observer(({ uiStore, tagStore, fileStore }: ISearchListProps) => {
  const selectedItems: ClientTag[] = [];
  uiStore.searchCriteriaList.forEach((c) => {
    if (c instanceof ClientIDSearchCriteria && c.value.length === 1) {
      const item = tagStore.get(c.value[0]);
      if (item) {
        selectedItems.push(item);
      }
    }
  });

  const handleSelect = action((item: ClientTag) =>
    uiStore.addSearchCriteria(new ClientIDSearchCriteria('tags', item.id, item.name)),
  );

  const handleDeselect = action((item: ClientTag) => {
    const crit = uiStore.searchCriteriaList.find(
      (c) => c instanceof ClientIDSearchCriteria && c.value.includes(item.id),
    );
    if (crit) {
      uiStore.removeSearchCriteria(crit);
    }
  });

  return (
    <MultiTagSelector
      selection={selectedItems}
      onSelect={handleSelect}
      onDeselect={handleDeselect}
      onTagClick={uiStore.toggleAdvancedSearch}
      onClear={uiStore.clearSearchCriteriaList}
      extraOption={{
        label: 'Advanced search',
        action: uiStore.toggleAdvancedSearch,
        icon: IconSet.SEARCH_EXTENDED,
      }}
      extraIconButtons={
        selectedItems.length > 1 ? (
          <IconButton
            icon={uiStore.searchMatchAny ? IconSet.SEARCH_ANY : IconSet.SEARCH_ALL}
            text={`Search using ${uiStore.searchMatchAny ? 'any' : 'all'} queries`}
            // TODO: Add this as tooltip. Current set-up sucks
            // title={`Search using ${uiStore.searchMatchAny ? 'any' : 'all'} queries`}
            onClick={() => {
              uiStore.toggleSearchMatchAny();
              fileStore.refetch();
            }}
            large
            disabled={selectedItems.length === 0}
          />
        ) : (
          <> </>
        )
      }
    />
  );
});

const CriteriaList = observer(({ uiStore, fileStore }: ISearchListProps) => {
  // Open advanced search when clicking one of the criteria (but not their delete buttons)
  const handleTagClick = (e: React.MouseEvent) => {
    if (e.currentTarget === e.target || (e.target as HTMLElement).matches('.tag')) {
      uiStore.toggleAdvancedSearch();
    }
  };

  return (
    <div className="input">
      <div className="multiautocomplete-input" onClick={handleTagClick}>
        <div className="input-wrapper">
          {uiStore.searchCriteriaList.map((c, i) => (
            <Tag
              key={`${i}-${c.toString()}`}
              text={c.toString()}
              onRemove={() => uiStore.removeSearchCriteriaByIndex(i)}
            />
          ))}
        </div>

        {uiStore.searchCriteriaList.length > 1 ? (
          <IconButton
            icon={uiStore.searchMatchAny ? IconSet.SEARCH_ANY : IconSet.SEARCH_ALL}
            text={`Search using ${uiStore.searchMatchAny ? 'any' : 'all'} queries`}
            // TODO: Add this as tooltip. Current set-up sucks
            // title={`Search using ${uiStore.searchMatchAny ? 'any' : 'all'} queries`}
            onClick={() => {
              uiStore.toggleSearchMatchAny();
              fileStore.refetch();
            }}
            large
            disabled={uiStore.searchCriteriaList.length === 0}
          />
        ) : (
          <> </>
        )}

        <IconButton icon={IconSet.CLOSE} text="Close" onClick={uiStore.clearSearchCriteriaList} />
      </div>
    </div>
  );
});
