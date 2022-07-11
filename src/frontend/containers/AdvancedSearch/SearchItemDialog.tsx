import { observer } from 'mobx-react-lite';
import React, { useState, useRef, useCallback } from 'react';
import { ClientFileSearch } from 'src/entities/SearchItem';
import { useStore } from 'src/frontend/contexts/StoreContext';
import { action, runInAction } from 'mobx';
import { Button } from 'widgets/Button';
import { IconSet } from 'widgets/Icons';
import { Dialog } from 'widgets/popovers';
import CriteriaBuilder from './CriteriaBuilder';
import { ClientFileSearchCriteria, IFileSearchCriteria } from 'src/entities/SearchCriteria';
import { QueryEditor, QueryMatch } from './QueryEditor';

type FileSearchEditorProps = {
  searchItem: ClientFileSearch;
  onClose: () => void;
};

/** Similar to the AdvancedSearchDialog */
const SearchItemDialog = observer<FileSearchEditorProps>(({ searchItem, onClose }) => {
  const { searchStore } = useStore();
  const idCounter = useRef(0);

  // Copy state of search item: only update the ClientSearchItem on submit.
  const [name, setName] = useState(searchItem.name);
  const [searchMatchAny, setSearchMatchAny] = useState(searchItem.matchAny);
  const toggle = useRef(() => setSearchMatchAny((v) => !v)).current;

  const criterias = searchItem.criterias;
  const [query, setQuery] = useState(
    action(() => {
      const map = new Map();
      for (const criteria of criterias) {
        const id = idCounter.current;
        idCounter.current += 1;
        map.set(id, ClientFileSearchCriteria.clone(criteria));
      }
      return map;
    }),
  );

  const keySelector = useRef<HTMLSelectElement>(null);

  const add = useRef((criteria: IFileSearchCriteria) => {
    const id = idCounter.current;
    idCounter.current += 1;
    setQuery((map) => new Map(map.set(id, criteria)));
  }).current;

  const handleSubmit = useCallback(() => {
    runInAction(() => {
      searchItem.setName(name);
      searchItem.setMatchAny(searchMatchAny);
      searchItem.setCriterias(...Array.from(query.values()));
      searchStore.save(searchItem);
      onClose();
    });
  }, [name, onClose, query, searchItem, searchMatchAny, searchStore]);

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
          autoFocus
          className="input"
          defaultValue={searchItem.name}
          onBlur={(e) => setName(e.target.value)}
          aria-labelledby="name"
        />

        <br />

        <CriteriaBuilder keySelector={keySelector} addCriteria={add} />

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
