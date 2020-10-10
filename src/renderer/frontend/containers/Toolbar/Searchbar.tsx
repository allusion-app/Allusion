import React, { useCallback, useContext } from 'react';
import { observer } from 'mobx-react-lite';
import StoreContext, { IRootStoreProp } from '../../contexts/StoreContext';
import { IconButton, IconSet, Tag } from 'components';
import { Tooltip } from 'components/popover';
import { ClientTag } from '../../../entities/Tag';
import { ClientIDSearchCriteria } from '../../../entities/SearchCriteria';
import { MultiTagSelector } from '../../components/MultiTagSelector';

const QuickSearchList = ({ rootStore: { uiStore, tagStore } }: IRootStoreProp) => {
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
};

interface ICriteriaList {
  criterias: string[];
  removeCriteriaByIndex: (index: number) => void;
  toggleAdvancedSearch: () => void;
}

const CriteriaList = ({
  criterias,
  toggleAdvancedSearch,
  removeCriteriaByIndex,
}: ICriteriaList) => {
  // // Open advanced search when clicking one of the criteria (but not their delete buttons)
  const handleTagClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) {
        e.stopPropagation();
        toggleAdvancedSearch();
      }
    },
    [toggleAdvancedSearch],
  );

  return (
    <div>
      {criterias.map((c, i) => (
        <Tag key={i} text={c} onClick={handleTagClick} onRemove={() => removeCriteriaByIndex(i)} />
      ))}
    </div>
  );
};

export const Searchbar = observer(() => {
  const rootStore = useContext(StoreContext);
  const {
    uiStore: { searchCriteriaList, toggleAdvancedSearch, removeSearchCriteriaByIndex },
    tagStore,
  } = rootStore;

  // Only show quick search bar when all criteria are tags or collections, else
  // show a search bar that opens to the advanced search form
  const isQuickSearch =
    searchCriteriaList.length === 0 ||
    searchCriteriaList.every((crit) => crit.key === 'tags' && crit.operator === 'contains');

  const criterias = searchCriteriaList.map((c) => {
    const label = c.toString();
    if (c instanceof ClientIDSearchCriteria && c.value.length === 1) {
      const tag = tagStore.get(c.value[0]);
      if (tag) {
        return label.concat(tag.name);
      }
    }
    return label;
  });

  return (
    <div className="quick-search">
      <Tooltip content="Open Advanced Search (Ctrl + Shift + F)" hoverDelay={1500}>
        <IconButton
          icon={IconSet.SEARCH_EXTENDED}
          onClick={toggleAdvancedSearch}
          text="Advanced Search"
        />
      </Tooltip>
      {isQuickSearch ? (
        <QuickSearchList rootStore={rootStore} />
      ) : (
        <CriteriaList
          criterias={criterias}
          toggleAdvancedSearch={toggleAdvancedSearch}
          removeCriteriaByIndex={removeSearchCriteriaByIndex}
        />
      )}
    </div>
  );
});

export default Searchbar;
