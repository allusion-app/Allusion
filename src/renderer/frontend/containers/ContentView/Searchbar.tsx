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

const CriteriaList = ({ rootStore: { uiStore } }: IRootStoreProp) => {
  const handleRemove = (_: string, index: number) => {
    uiStore.removeSearchCriteriaByIndex(index);
  };

  const preventTyping = useCallback((e: React.KeyboardEvent<HTMLElement>, i?: number) => {
    // If it's not an event on an existing Tag element, ignore it
    if (i === undefined && !e.ctrlKey) {
      e.preventDefault();
    }
  }, []);

  // Open advanced search when clicking one of the criteria (but not their delete buttons)
  const handleTagClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).tagName === 'SPAN') {
      uiStore.toggleAdvancedSearch();
    }
  };

  return (
    <div id="criteria-list">
      <TagInput
        values={uiStore.searchCriteriaList.map((crit) => `${crit.toString()}`)}
        onRemove={handleRemove}
        inputProps={{ disabled: true, onMouseUp: uiStore.toggleAdvancedSearch }}
        onKeyDown={preventTyping}
        tagProps={{ minimal: true, intent: 'primary', onClick: handleTagClick, interactive: true }}
        fill
      />
    </div>
  );
};

interface ISearch extends IRootStoreProp {
  isOpen: boolean;
  isQuickSearch: boolean;
}

const SearchList = ({ rootStore, isOpen, isQuickSearch }: ISearch) => {
  const {
    fileStore: { content },
    uiStore: { searchByQuery, searchCriteriaList, clearSearchCriteriaList },
  } = rootStore;

  // On closing the searchbar clean up if there are still criterias.
  useEffect(() => {
    return () => {
      if (isOpen && searchCriteriaList.length > 0) {
        clearSearchCriteriaList();
      }
    };
  }, [clearSearchCriteriaList, isOpen, searchCriteriaList.length]);

  // Fetch whenever a query changes
  useEffect(() => {
    if (searchCriteriaList.length > 0) {
      console.log('Fetch query...');
      searchByQuery();
    }
  }, [searchCriteriaList, searchByQuery, searchCriteriaList.length, clearSearchCriteriaList]);

  // Show all files when search bar has been emptied by the user
  useEffect(() => {
    if (isOpen && searchCriteriaList.length === 0 && content === 'query') {
      clearSearchCriteriaList();
    }
  }, [clearSearchCriteriaList, content, isOpen, searchCriteriaList.length]);

  if (isQuickSearch) {
    return <QuickSearchList rootStore={rootStore} />;
  } else {
    return <CriteriaList rootStore={rootStore} />;
  }
};

export const SearchBar = observer(() => {
  const rootStore = useContext(StoreContext);
  const { uiStore } = rootStore;

  // Only show quick search bar when all criteria are tags or collections, else show a search bar that opens to the advanced search form
  const isQuickSearch =
    uiStore.searchCriteriaList.length === 0 ||
    uiStore.searchCriteriaList.every((crit) => crit.key === 'tags');

  useEffect(() => {
    if (uiStore.searchCriteriaList.length > 0 && !uiStore.isQuickSearchOpen) {
      uiStore.openQuickSearch();
    }
  }, [uiStore, uiStore.isQuickSearchOpen, uiStore.searchCriteriaList.length]);

  return (
    <CSSTransition
      in={uiStore.isQuickSearchOpen}
      classNames="quick-search"
      timeout={200}
      unmountOnExit
    >
      <div className="quick-search">
        <Button
          minimal
          icon={IconSet.SEARCH_EXTENDED}
          onClick={uiStore.toggleAdvancedSearch}
          title="Advanced search"
        />
        <SearchList
          rootStore={rootStore}
          isOpen={uiStore.isQuickSearchOpen}
          isQuickSearch={isQuickSearch}
        />
        <Button
          minimal
          icon={IconSet.CLOSE}
          onClick={uiStore.closeQuickSearch}
          title="Close (Escape)"
        />
      </div>
    </CSSTransition>
  );
});

export default SearchBar;
