import { observer } from 'mobx-react-lite';
import React, { useCallback, useRef, useState } from 'react';
import { useStore } from 'src/frontend/contexts/StoreContext';
import { useAutorun } from 'src/frontend/hooks/mobx';
import { Button, IconSet } from 'widgets';
import { Dialog } from 'widgets/popovers';
import CriteriaBuilder from './CriteriaBuilder';
import { ClientFileSearchCriteria } from 'src/entities/SearchCriteria';
import { FileSearchCriteriaDTO } from 'src/api/FileSearchDTO';
import { QueryEditor, QueryMatch } from './QueryEditor';

export const AdvancedSearchDialog = observer(() => {
  const { uiStore } = useStore();
  const [query, setQuery] = useState(new Map<number, FileSearchCriteriaDTO>());
  const keySelector = useRef<HTMLSelectElement>(null);
  const idCounter = useRef(0);

  // Initialize form with current queries. When the form is closed, all inputs
  // are unmounted to save memory.
  useAutorun(() => {
    const map = new Map();
    if (uiStore.isAdvancedSearchOpen) {
      for (const criteria of uiStore.searchCriteriaList) {
        const id = idCounter.current;
        idCounter.current += 1;
        map.set(id, ClientFileSearchCriteria.clone(criteria));
      }
      requestAnimationFrame(() => requestAnimationFrame(() => keySelector.current?.focus()));
    } else {
      idCounter.current = 0;
    }
    setQuery(map);
  });

  const add = useRef((criteria: FileSearchCriteriaDTO) => {
    const id = idCounter.current;
    idCounter.current += 1;
    setQuery((map) => new Map(map.set(id, criteria)));
  }).current;

  const search = useCallback(() => {
    uiStore.replaceSearchCriteria(...Array.from(query.values()));
    uiStore.closeAdvancedSearch();
  }, [query, uiStore]);

  const reset = useRef(() => setQuery(new Map())).current;

  return (
    <Dialog
      open={uiStore.isAdvancedSearchOpen}
      title="Advanced Search"
      icon={IconSet.SEARCH_EXTENDED}
      onCancel={uiStore.closeAdvancedSearch}
    >
      <form id="search-form" role="search" method="dialog" onSubmit={(e) => e.preventDefault()}>
        <CriteriaBuilder keySelector={keySelector} addCriteria={add} />

        <QueryEditor query={query} setQuery={setQuery} submissionButtonText="Search" />

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
