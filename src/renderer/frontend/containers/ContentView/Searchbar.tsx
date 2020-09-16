import React, { useContext } from 'react';
import { observer } from 'mobx-react-lite';
import { TagInput } from '@blueprintjs/core';
import StoreContext, { IRootStoreProp } from '../../contexts/StoreContext';
import { IconButton, IconSet } from 'components';
import { Tooltip } from 'components/popover';
import { ClientTag } from '../../../entities/Tag';
import {
  ClientIDSearchCriteria,
  ClientCollectionSearchCriteria,
} from '../../../entities/SearchCriteria';
import MultiTagSelector from '../../components/MultiTagSelector';
import { ClientTagCollection } from '../../../entities/TagCollection';

const QuickSearchList = ({
  rootStore: { uiStore, tagStore, tagCollectionStore },
}: IRootStoreProp) => {
  const selectedItems: (ClientTag | ClientTagCollection)[] = [];
  uiStore.searchCriteriaList.forEach((c) => {
    let item;
    if (c instanceof ClientIDSearchCriteria && c.value.length === 1) {
      item = tagStore.get(c.value[0]);
    } else if (c instanceof ClientCollectionSearchCriteria) {
      item = tagCollectionStore.get(c.collectionId);
    }
    if (item) {
      selectedItems.push(item);
    }
  });

  const handleSelectTag = (tag: ClientTag) => {
    uiStore.addSearchCriteria(new ClientIDSearchCriteria('tags', tag.id, tag.name));
  };

  const handleSelectCol = (col: ClientTagCollection) => {
    uiStore.addSearchCriteria(
      new ClientCollectionSearchCriteria(col.id, col.getTagsRecursively(), col.name),
    );
  };

  const handleDeselectTag = (tag: ClientTag) => {
    const crit = uiStore.searchCriteriaList.find(
      (c) => c instanceof ClientIDSearchCriteria && c.value.includes(tag.id),
    );
    if (crit) {
      uiStore.removeSearchCriteria(crit);
    }
  };

  const handleDeselectCol = (col: ClientTagCollection) => {
    const crit = uiStore.searchCriteriaList.find(
      (c) => c instanceof ClientCollectionSearchCriteria && c.collectionId === col.id,
    );
    if (crit) {
      uiStore.removeSearchCriteria(crit);
    }
  };

  return (
    <MultiTagSelector
      selectedItems={selectedItems}
      onTagSelect={handleSelectTag}
      onTagDeselect={handleDeselectTag}
      onClearSelection={uiStore.clearSearchCriteriaList}
      autoFocus={!uiStore.isAdvancedSearchOpen} // don't auto focus with advanced search open; focus is needed there instead
      tagIntent="primary"
      showClearButton={false}
      includeCollections
      onTagColDeselect={handleDeselectCol}
      onTagColSelect={handleSelectCol}
    />
  );
};

interface ICriteriaList {
  criterias: React.ReactNode[];
  removeCriteriaByIndex: (index: number) => void;
  toggleAdvancedSearch: () => void;
}

const CriteriaList = ({
  criterias,
  toggleAdvancedSearch,
  removeCriteriaByIndex,
}: ICriteriaList) => {
  const preventTyping = (e: React.KeyboardEvent<HTMLElement>, i?: number) => {
    // If it's not an event on an existing Tag element, ignore it
    if (i === undefined && !e.ctrlKey) {
      e.preventDefault();
    }
  };

  // Open advanced search when clicking one of the criteria (but not their delete buttons)
  const handleTagClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).tagName === 'SPAN') {
      toggleAdvancedSearch();
    }
  };

  return (
    <TagInput
      values={criterias}
      onRemove={(_, i) => removeCriteriaByIndex(i)}
      inputProps={{ disabled: true, onMouseUp: toggleAdvancedSearch }}
      onKeyDown={preventTyping}
      tagProps={{ minimal: true, intent: 'primary', onClick: handleTagClick, interactive: true }}
      fill
    />
  );
};

export const Searchbar = observer(() => {
  const rootStore = useContext(StoreContext);
  const {
    uiStore: {
      searchCriteriaList,
      clearSearchCriteriaList,
      toggleAdvancedSearch,
      removeSearchCriteriaByIndex,
    },
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
      <Tooltip content="Clear Search" hoverDelay={1500}>
        <IconButton icon={IconSet.CLOSE} onClick={clearSearchCriteriaList} text="Close" />
      </Tooltip>
    </div>
  );
});

export default Searchbar;
