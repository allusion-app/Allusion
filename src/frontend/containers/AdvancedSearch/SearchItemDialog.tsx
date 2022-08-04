import { observer } from 'mobx-react-lite';
import React, { useState, useRef, useCallback } from 'react';
import { ID } from 'src/api/ID';
import { ClientFileSearchItem } from 'src/entities/SearchItem';
import { useStore } from 'src/frontend/contexts/StoreContext';
import { useAutorun } from 'src/frontend/hooks/mobx';
import { Button } from 'widgets/Button';
import { IconSet } from 'widgets/Icons';
import { Dialog } from 'widgets/popovers';
import CriteriaBuilder from './CriteriaBuilder';
import { Criteria, fromCriteria, intoCriteria } from './data';
import { QueryEditor, QueryMatch } from './QueryEditor';

interface ISearchItemDialogProps {
  searchItem: ClientFileSearchItem;
  onClose: () => void;
}

/** Similar to the AdvancedSearchDialog */
const SearchItemDialog = observer<ISearchItemDialogProps>(({ searchItem, onClose }) => {
  const rootStore = useStore();
  const { tagStore, searchStore } = rootStore;

  // Copy state of search item: only update the ClientSearchItem on submit.
  const [name, setName] = useState(searchItem.name);
  const [searchMatchAny, setSearchMatchAny] = useState(searchItem.matchAny);
  const toggle = useCallback(() => setSearchMatchAny((v) => !v), []);

  const [query, setQuery] = useState(new Map<ID, Criteria>());
  const keySelector = useRef<HTMLSelectElement>(null);
  const nameInput = useRef<HTMLInputElement>(null);

  // Initialize form with current queries. When the form is closed, all inputs
  // are unmounted to save memory.
  useAutorun(() => {
    const map = new Map();
    for (const criteria of searchItem.criteria) {
      const [id, query] = fromCriteria(criteria);
      map.set(id, query);
    }
    // Focus and select the input text so the user can rename immediately after creating a new search item
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        nameInput.current?.focus();
        nameInput.current?.select();
      }),
    );
    setQuery(map);
  });

  const handleSubmit = useCallback(async () => {
    searchItem.setName(name);
    searchItem.setMatchAny(searchMatchAny);
    searchItem.setCriteria(Array.from(query.values(), (vals) => intoCriteria(vals, tagStore)));
    searchStore.save(searchItem);
    onClose();
  }, [name, onClose, query, searchItem, searchMatchAny, searchStore, tagStore]);

  return (
    <Dialog
      open
      title={`Search: "${searchItem.name}"`}
      icon={IconSet.SEARCH_EXTENDED}
      onCancel={onClose}
    >
      <form
        id="search-form"
        role="search"
        method="dialog"
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmit();
        }}
      >
        <label id="name">Name</label>
        <input
          className="input"
          defaultValue={searchItem.name}
          onBlur={(e) => setName(e.target.value)}
          aria-labelledby="name"
          autoFocus
          ref={nameInput}
        />

        <br />

        <CriteriaBuilder keySelector={keySelector} dispatch={setQuery} />

        <QueryEditor query={query} setQuery={setQuery} submissionButtonText="Save" />

        <QueryMatch toggle={toggle} searchMatchAny={searchMatchAny} />

        <fieldset className="dialog-actions">
          <Button styling="outlined" text="Close" icon={IconSet.CLOSE} onClick={onClose} />
          <Button
            styling="filled"
            text="Save"
            icon={IconSet.SELECT_CHECKED}
            onClick={handleSubmit}
            disabled={query.size === 0}
          />
        </fieldset>
      </form>
    </Dialog>
  );
});

export default SearchItemDialog;
