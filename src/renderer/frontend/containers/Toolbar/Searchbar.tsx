import React, { useCallback, useContext } from 'react';
import { observer } from 'mobx-react-lite';
import StoreContext from '../../contexts/StoreContext';
import { Tag } from 'components';
import { ClientTag } from '../../../entities/Tag';
import { ClientIDSearchCriteria } from '../../../entities/SearchCriteria';
import { MultiTagSelector } from '../../components/MultiTagSelector';

const QuickSearchList = observer(() => {
  const { uiStore, tagStore } = useContext(StoreContext);
  const selectedItems: ClientTag[] = [];
  uiStore.searchCriteriaList.forEach((c) => {
    if (c instanceof ClientIDSearchCriteria && c.value.length === 1) {
      const item = tagStore.get(c.value[0]);
      if (item) {
        selectedItems.push(item);
      }
    }
  });

  const handleSelect = (item: ClientTag) =>
    uiStore.addSearchCriteria(new ClientIDSearchCriteria('tags', item.id, item.name));

  const handleDeselect = (item: ClientTag) => {
    const crit = uiStore.searchCriteriaList.find(
      (c) => c instanceof ClientIDSearchCriteria && c.value.includes(item.id),
    );
    if (crit) {
      uiStore.removeSearchCriteria(crit);
    }
  };

  return (
    <MultiTagSelector
      selection={selectedItems}
      onSelect={handleSelect}
      onDeselect={handleDeselect}
      onClear={uiStore.clearSearchCriteriaList}
    />
  );
});

const CriteriaList = observer(() => {
  const { uiStore, tagStore } = useContext(StoreContext);

  // // Open advanced search when clicking one of the criteria (but not their delete buttons)
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

export const Searchbar = observer(() => {
  const {
    uiStore: { searchCriteriaList },
  } = useContext(StoreContext);

  // Only show quick search bar when all criteria are tags or collections, else
  // show a search bar that opens to the advanced search form
  const isQuickSearch =
    searchCriteriaList.length === 0 ||
    searchCriteriaList.every((crit) => crit.key === 'tags' && crit.operator === 'contains');

  return (
    <div className="toolbar-input">{isQuickSearch ? <QuickSearchList /> : <CriteriaList />}</div>
  );
});

export default Searchbar;
