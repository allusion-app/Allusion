import React, { useCallback, useContext } from 'react';
import { action } from 'mobx';
import { observer } from 'mobx-react-lite';

import StoreContext from 'src/frontend/contexts/StoreContext';

const Searchbar = observer(() => {
  const { uiStore, tagStore } = useContext(StoreContext);
  const searchCriteriaList = uiStore.searchCriteriaList;

  // Only show quick search bar when all criteria are tags or collections, else
  // show a search bar that opens to the advanced search form
  const isQuickSearch =
    searchCriteriaList.length === 0 ||
    searchCriteriaList.every((crit) => crit.key === 'tags' && crit.operator === 'contains');

  return (
    <div className="toolbar-input">
      {isQuickSearch ? (
        <QuickSearchList uiStore={uiStore} tagStore={tagStore} />
      ) : (
        <CriteriaList uiStore={uiStore} tagStore={tagStore} />
      )}
    </div>
  );
});

export default Searchbar;

import { ClientIDSearchCriteria } from 'src/entities/SearchCriteria';
import { ClientTag } from 'src/entities/Tag';

import UiStore from 'src/frontend/stores/UiStore';
import TagStore from 'src/frontend/stores/TagStore';

import { IconSet, Tag } from 'widgets';

import { MultiTagSelector } from 'src/frontend/components/MultiTagSelector';

interface ISearchListProps {
  uiStore: UiStore;
  tagStore: TagStore;
}

const QuickSearchList = observer(({ uiStore, tagStore }: ISearchListProps) => {
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
      listboxID="quick-search-listbox"
      selection={selectedItems}
      onSelect={handleSelect}
      onDeselect={handleDeselect}
      onClear={uiStore.clearSearchCriteriaList}
      extraOption={{
        label: 'Advanced search',
        action: uiStore.toggleAdvancedSearch,
        icon: IconSet.SEARCH_EXTENDED,
      }}
    />
  );
});

const CriteriaList = observer(({ uiStore, tagStore }: ISearchListProps) => {
  // Open advanced search when clicking one of the criteria (but not their delete buttons)
  const handleTagClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) {
        e.stopPropagation();
        uiStore.toggleAdvancedSearch();
      }
    },
    [uiStore],
  );

  return (
    <div className="input">
      {uiStore.searchCriteriaList.map((c, i) => {
        let label = c.toString();
        if (c instanceof ClientIDSearchCriteria && c.value.length === 1) {
          const tag = tagStore.get(c.value[0]);
          if (tag !== undefined) {
            label = label.concat(tag.name);
          }
        }
        return (
          <Tag
            key={i}
            text={label}
            onClick={handleTagClick}
            onRemove={() => uiStore.removeSearchCriteriaByIndex(i)}
          />
        );
      })}
    </div>
  );
});
