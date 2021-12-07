import { runInAction } from 'mobx';
import { observer } from 'mobx-react-lite';
import React, { ForwardedRef, useCallback, useMemo, useRef, useState } from 'react';
import { IFile } from 'src/entities/File';
import { ClientBaseCriteria, CustomKeyDict, SearchCriteria } from 'src/entities/SearchCriteria';
import { useStore } from 'src/frontend/contexts/StoreContext';
import RootStore from 'src/frontend/stores/RootStore';
import { FileSearchCriteria } from 'src/frontend/stores/UiStore';
import { IconButton } from 'widgets/Button';
import { Grid } from 'widgets/Combobox';
import { IconSet } from 'widgets/Icons';
import { MenuDivider } from 'widgets/menus';
import { Flyout } from 'widgets/popovers';
import { Tag } from 'widgets/Tag';
import { generateWidgetId } from 'widgets/utility';

const RECENT_SEARCH_COUNT = 10;

export const getRecentSearches = () => {
  try {
    const searchItems = JSON.parse(localStorage.getItem('searchHistory') || '[]') as ISearchItem[];
    return searchItems.map((item) => new SearchItem(item.criteria, item.matchAny));
  } catch (e) {
    console.error('Could not recover search history', e);
    return [];
  }
};

export const storeRecentSearch = (item: ISearchItem) => {
  const currentSearches = getRecentSearches();

  // If the search item was already present, move it back to the top of the list
  // const index = currentSearches.findIndex((searchItem) => searchItem.criteria.equals(item.criteria));
  // if (index !== -1) {
  //   currentSearches.splice(index, 1);

  // }

  const newSearches = [item, ...currentSearches].slice(0, RECENT_SEARCH_COUNT);

  localStorage.setItem('searchHistory', JSON.stringify(newSearches));
};

interface ISearchItem {
  // name: string?
  criteria: SearchCriteria<IFile>[];
  matchAny?: boolean;
}

class SearchItem {
  criteria: FileSearchCriteria[];
  matchAny?: boolean;

  constructor(criteria: SearchCriteria<IFile>[], matchAny?: boolean) {
    this.criteria = criteria.map((c) => ClientBaseCriteria.deserialize(c));
    this.matchAny = matchAny;
  }

  serialize(rootStore: RootStore): ISearchItem {
    return {
      criteria: this.criteria.map((c) => c.serialize(rootStore)),
      matchAny: this.matchAny,
    };
  }
}

const SearchHistory = () => {
  const gridId = useRef(generateWidgetId('__suggestions')).current;

  const { uiStore } = useStore();

  const [isOpen, setIsOpen] = useState(false);

  const handleClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsOpen((isOpen) => !isOpen);
  }, []);

  const handleSelect = useCallback(
    (item: SearchItem) => {
      setIsOpen(false);

      runInAction(() => {
        uiStore.replaceSearchCriterias(item.criteria);
        if (uiStore.searchMatchAny !== !!item.matchAny) {
          uiStore.toggleSearchMatchAny();
        }
      });
    },
    [uiStore],
  );

  const gridRef = useRef<HTMLDivElement>(null);

  return (
    <Flyout
      isOpen={isOpen}
      cancel={() => setIsOpen(false)}
      placement="bottom-start"
      target={
        <IconButton
          icon={IconSet.ARROW_DOWN}
          text="Pick a recent search query"
          onClick={handleClick}
          className="btn-icon-large"
        />
      }
    >
      <RecentSearchList ref={gridRef} id={gridId} selectItem={handleSelect} />
    </Flyout>
  );
};

interface RecentSearchListProps {
  id: string;
  selectItem: (item: SearchItem) => void;
}

const RecentSearchList = observer(
  (props: RecentSearchListProps, ref: ForwardedRef<HTMLDivElement>) => {
    const { id, selectItem } = props;
    const rootStore = useStore();

    const items = useMemo(() => getRecentSearches(), []);

    return (
      <Grid ref={ref} id={id}>
        {items.map((item, index) => (
          <div
            key={`item-${index}`}
            className="recent-search-item"
            onClick={() => selectItem(item)}
          >
            <span>
              {index + 1}: Search {item.matchAny ? 'any' : 'all'}
            </span>
            <div>
              {item.criteria.map((c, i) => (
                <Tag
                  key={`${i}-${c.getLabel(CustomKeyDict, rootStore)}`}
                  text={c.getLabel(CustomKeyDict, rootStore)}
                />
              ))}
            </div>
            {index !== items.length - 1 && <MenuDivider />}
          </div>
        ))}
        {items.length === 0 && <i>No recent searches</i>}
      </Grid>
    );
  },
  { forwardRef: true },
);

export default SearchHistory;
