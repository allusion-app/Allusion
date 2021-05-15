import React, { useContext } from 'react';
import { action } from 'mobx';
import { observer } from 'mobx-react-lite';

import StoreContext from 'src/frontend/contexts/StoreContext';

const Searchbar = observer(() => {
  const { uiStore, tagStore, fileStore } = useContext(StoreContext);
  const searchCriteriaList = uiStore.searchCriteriaList;

  // Only show quick search bar when all criteria are tags,
  // otherwise show a search bar that opens to the advanced search form
  // Exception: Searching for untagged files (tag contains empty value)
  // -> show as custom label in CriteriaList
  const isQuickSearch =
    searchCriteriaList.length === 0 ||
    searchCriteriaList.every(
      (crit) =>
        crit.key === 'tags' &&
        crit.operator === 'containsRecursively' &&
        (crit as ClientTagSearchCriteria<any>).value.length,
    );

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

import { ClientStringSearchCriteria, ClientTagSearchCriteria } from 'src/entities/SearchCriteria';
import { ClientTag } from 'src/entities/Tag';

import UiStore from 'src/frontend/stores/UiStore';
import TagStore from 'src/frontend/stores/TagStore';

import { IconButton, IconSet, Tag } from 'widgets';

import { MultiTagSelector } from 'src/frontend/components/MultiTagSelector';
import FileStore from 'src/frontend/stores/FileStore';
import { CustomKeyDict } from '../types';

interface ISearchListProps {
  uiStore: UiStore;
  tagStore: TagStore;
  fileStore: FileStore;
}

const QuickSearchList = observer(({ uiStore, tagStore, fileStore }: ISearchListProps) => {
  const selectedItems: ClientTag[] = [];
  uiStore.searchCriteriaList.forEach((c) => {
    if (c instanceof ClientTagSearchCriteria && c.value.length === 1) {
      const item = tagStore.get(c.value[0]);
      if (item) {
        selectedItems.push(item);
      }
    }
  });

  const handleSelect = action((item: Readonly<ClientTag>) =>
    uiStore.addSearchCriteria(new ClientTagSearchCriteria(tagStore, 'tags', item.id, item.name)),
  );

  const handleDeselect = action((item: Readonly<ClientTag>) => {
    const crit = uiStore.searchCriteriaList.find(
      (c) => c instanceof ClientTagSearchCriteria && c.value.includes(item.id),
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
      extraOptions={[
        {
          id: 'search-in-path',
          label: (input) => `Search in file paths for "${input}"`,
          action: (query) =>
            uiStore.addSearchCriteria(
              new ClientStringSearchCriteria('absolutePath', query, undefined, CustomKeyDict),
            ),
          resetQueryOnAction: true,
        },
        {
          id: 'advanced-search',
          label: 'Advanced search',
          action: uiStore.toggleAdvancedSearch,
          icon: IconSet.SEARCH_EXTENDED,
        },
      ]}
      extraIconButtons={
        selectedItems.length > 1 ? (
          <IconButton
            icon={uiStore.searchMatchAny ? IconSet.SEARCH_ANY : IconSet.SEARCH_ALL}
            text={`Search using ${uiStore.searchMatchAny ? 'any' : 'all'} queries`}
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
  return (
    <div className="input" onClick={uiStore.toggleAdvancedSearch}>
      <div className="multiautocomplete-input">
        <div className="input-wrapper">
          {uiStore.searchCriteriaList.map((c, i) => (
            <Tag
              key={`${i}-${c.toString()}`}
              text={c.toString()}
              onRemove={() => uiStore.removeSearchCriteriaByIndex(i)}
              // Italicize system tags (for now only "Untagged images")
              className={
                c instanceof ClientTagSearchCriteria && c.isSystemTag() ? 'italic' : undefined
              }
            />
          ))}
        </div>

        {uiStore.searchCriteriaList.length > 1 ? (
          <IconButton
            icon={uiStore.searchMatchAny ? IconSet.SEARCH_ANY : IconSet.SEARCH_ALL}
            text={`Search using ${uiStore.searchMatchAny ? 'any' : 'all'} queries`}
            onClick={(e) => {
              uiStore.toggleSearchMatchAny();
              fileStore.refetch();
              e.stopPropagation();
              e.preventDefault();
            }}
            large
          />
        ) : (
          <> </>
        )}

        <IconButton
          icon={IconSet.CLOSE}
          text="Clear"
          onClick={(e) => {
            uiStore.clearSearchCriteriaList();
            e.stopPropagation();
            e.preventDefault();
          }}
        />
      </div>
    </div>
  );
});
