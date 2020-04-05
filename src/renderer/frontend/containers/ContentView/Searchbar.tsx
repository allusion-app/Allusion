import React, { useContext, useEffect, useCallback } from 'react';
import { observer } from 'mobx-react-lite';
import { Button, TagInput } from '@blueprintjs/core';
import { CSSTransition } from 'react-transition-group';
import StoreContext, { IRootStoreProp } from '../../contexts/StoreContext';
import IconSet from '../../components/Icons';
import { ClientTag } from '../../../entities/Tag';
import {
  ClientIDSearchCriteria,
  ClientCollectionSearchCriteria,
  ClientArraySearchCriteria,
} from '../../../entities/SearchCriteria';
import MultiTagSelector from '../../components/MultiTagSelector';
import { ClientTagCollection } from '../../../entities/TagCollection';
import { camelCaseToSpaced } from '../../utils';

const QuickSearchList = ({
  rootStore: { uiStore, tagStore, tagCollectionStore },
}: IRootStoreProp) => {
  const selectedItems: (ClientTag | ClientTagCollection)[] = [];
  uiStore.searchCriteriaList.forEach((c) => {
    if (c instanceof ClientIDSearchCriteria) {
      const tag = tagStore.get(c.value.length === 1 ? c.value[0] : '');
      if (tag) {
        selectedItems.push(tag);
      }
    } else if (c instanceof ClientCollectionSearchCriteria) {
      const col = tagCollectionStore.get(c.collectionId);
      if (col) {
        selectedItems.push(col);
      }
    } else if (c instanceof ClientArraySearchCriteria) {
      if (c.key === 'tags') {
        selectedItems.push(
          ...(c.value.map((v) => tagStore.get(v)).filter((t) => t !== undefined) as ClientTag[]),
        );
      }
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

  const handleCloseSearch = (e: React.KeyboardEvent) => {
    if (e.key.toLowerCase() === uiStore.hotkeyMap.closeSearch) {
      e.preventDefault();
      // Prevent react update on unmounted component while searchbar is closing
      uiStore.closeQuickSearch();
    }
  };

  return (
    <MultiTagSelector
      selectedItems={selectedItems}
      onTagSelect={handleSelectTag}
      onTagDeselect={handleDeselectTag}
      onClearSelection={uiStore.clearSearchCriteriaList}
      autoFocus
      tagIntent="primary"
      onKeyDown={handleCloseSearch}
      showClearButton={false}
      includeCollections
      onTagColDeselect={handleDeselectCol}
      onTagColSelect={handleSelectCol}
    />
  );
};

interface ICriteriaList {
  criterias: React.ReactNode[];
  onRemove: (value: string, index: number) => void;
  toggleAdvancedSearch: () => void;
}

// eslint-disable-next-line react/display-name
const CriteriaList = React.memo(({ criterias, toggleAdvancedSearch, onRemove }: ICriteriaList) => {
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
    <div id="criteria-list">
      <TagInput
        values={criterias}
        onRemove={onRemove}
        inputProps={{ disabled: true, onMouseUp: toggleAdvancedSearch }}
        onKeyDown={preventTyping}
        tagProps={{ minimal: true, intent: 'primary', onClick: handleTagClick, interactive: true }}
        fill
      />
    </div>
  );
});

export const Searchbar = observer(() => {
  const rootStore = useContext(StoreContext);
  const {
    uiStore: {
      isQuickSearchOpen,
      searchCriteriaList,
      openQuickSearch,
      clearSearchCriteriaList,
      closeQuickSearch,
      toggleAdvancedSearch,
      searchByQuery,
      removeSearchCriteriaByIndex,
    },
    tagStore,
    tagCollectionStore
  } = rootStore;

  // Only show quick search bar when all criteria are tags or collections, else
  // show a search bar that opens to the advanced search form
  const isQuickSearch =
    searchCriteriaList.length === 0 || searchCriteriaList.every((crit) => crit.key === 'tags');

  // Open searchbar on adding queries
  useEffect(() => {
    if (searchCriteriaList.length > 0 && !isQuickSearchOpen) {
      openQuickSearch();
    }
  }, [isQuickSearchOpen, openQuickSearch, searchCriteriaList.length]);

  // Fetch whenever a query changes
  useEffect(() => {
    if (searchCriteriaList.length > 0) {
      searchByQuery();
    }
  }, [searchByQuery, searchCriteriaList.length]);

  // Fatch all files when search bar has been emptied by the user
  useEffect(() => {
    if (isQuickSearchOpen && searchCriteriaList.length === 0) {
      clearSearchCriteriaList();
    }
  }, [clearSearchCriteriaList, isQuickSearchOpen, searchCriteriaList.length]);

  const handleOnRemove = useCallback(
    (_: string, index: number) => {
      removeSearchCriteriaByIndex(index);
    },
    [removeSearchCriteriaByIndex],
  );

  const criterias: React.ReactNode[] = [];
  for (const criteria of searchCriteriaList) {
    if (criteria instanceof ClientIDSearchCriteria || criteria instanceof ClientCollectionSearchCriteria) {
      const label = `${camelCaseToSpaced(criteria.key as string)} ${camelCaseToSpaced(criteria.operator)} `;
      if (criteria.label) {
        criterias.push(label.concat(`"${criteria.label}"`))
      } else if (criteria instanceof ClientIDSearchCriteria) {
        criterias.push(label.concat(`"${tagStore.get(criteria.value[0])?.name}"`))
      } else {
        criterias.push(label.concat(`"${tagCollectionStore.get(criteria.value[0])?.name}"`))
      }
    } else {
      criterias.push(criteria.toString());
    }
  }

  return (
    <CSSTransition in={isQuickSearchOpen} classNames="quick-search" timeout={200} unmountOnExit>
      <div className="quick-search">
        <Button
          minimal
          icon={IconSet.SEARCH_EXTENDED}
          onClick={toggleAdvancedSearch}
          title="Advanced search"
        />
        {isQuickSearch ? (
          <QuickSearchList rootStore={rootStore} />
        ) : (
          <CriteriaList
            criterias={criterias}
            toggleAdvancedSearch={toggleAdvancedSearch}
            onRemove={handleOnRemove}
          />
        )}
        <Button minimal icon={IconSet.CLOSE} onClick={closeQuickSearch} title="Close (Escape)" />
      </div>
    </CSSTransition>
  );
});

export default Searchbar;
