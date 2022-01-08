import { observer } from 'mobx-react-lite';
import React, { useCallback, useRef, useState } from 'react';
import { ID } from 'src/entities/ID';
import { useStore } from 'src/frontend/contexts/StoreContext';
import { useAutorun } from 'src/frontend/hooks/mobx';
import { Button, IconSet } from 'widgets';
import { Dialog } from 'widgets/popovers';
import CriteriaBuilder from './CriteriaBuilder';
import { Criteria, fromCriteria, intoCriteria } from './data';
import { QueryEditor, QueryMatch } from './QueryEditor';

export const AdvancedSearchDialog = observer(() => {
  const { uiStore, tagStore } = useStore();
  const [query, setQuery] = useState(new Map<ID, Criteria>());
  const keySelector = useRef<HTMLSelectElement>(null);

  // Initialize form with current queries. When the form is closed, all inputs
  // are unmounted to save memory.
  useAutorun(() => {
    const map = new Map();
    if (uiStore.isAdvancedSearchOpen) {
      for (const criteria of uiStore.searchCriteriaList) {
        const [id, query] = fromCriteria(criteria);
        map.set(id, query);
      }
      requestAnimationFrame(() => requestAnimationFrame(() => keySelector.current?.focus()));
    }
    setQuery(map);
  });

  const search = useCallback(() => {
    uiStore.replaceSearchCriterias(
      Array.from(query.values(), (vals) => intoCriteria(vals, tagStore)),
    );
    uiStore.closeAdvancedSearch();
  }, [query, tagStore, uiStore]);

  const reset = useRef(() => setQuery(new Map())).current;

  return (
    <Dialog
      open={uiStore.isAdvancedSearchOpen}
      title="Advanced Search"
      icon={IconSet.SEARCH_EXTENDED}
      onCancel={uiStore.closeAdvancedSearch}
    >
      <form id="search-form" role="search" method="dialog" onSubmit={(e) => e.preventDefault()}>
        <CriteriaBuilder keySelector={keySelector} dispatch={setQuery} />

        <QueryEditor query={query} setQuery={setQuery} />

        <QueryMatch searchMatchAny={uiStore.searchMatchAny} toggle={uiStore.toggleSearchMatchAny} />

        <fieldset className="dialog-actions">
          <Button styling="outlined" text="Reset" icon={IconSet.CLOSE} onClick={reset} />
          <Button
            styling="filled"
            text="Search"
            icon={IconSet.SEARCH}
            onClick={search}
            disabled={query.size === 0}
          />
        </fieldset>
      </form>
    </Dialog>
  );
});

export default AdvancedSearchDialog;
