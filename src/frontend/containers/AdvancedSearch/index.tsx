import React, { useCallback, useState, useEffect, useRef } from 'react';
import { autorun } from 'mobx';
import { observer } from 'mobx-react-lite';

import { generateId, ID } from 'src/entities/ID';
import { useStore } from 'src/frontend/contexts/StoreContext';
import { IconSet, RadioGroup, Radio } from 'widgets';
import Field from './Field';
import { Query, defaultQuery, fromCriteria, intoCriteria } from './query';

export const AdvancedSearchDialog = observer(() => {
  const dialog = useRef<HTMLDialogElement>(null);
  const { uiStore } = useStore();

  useEffect(() => {
    const element = dialog.current;
    if (element === null) {
      return;
    }

    element.addEventListener('cancel', uiStore.closeAdvancedSearch);
    element.addEventListener('close', uiStore.closeAdvancedSearch);

    const dispose = autorun(() => {
      if (uiStore.isAdvancedSearchOpen) {
        element.showModal();
      } else {
        element.close();
      }
    });

    return () => {
      element.removeEventListener('cancel', uiStore.closeAdvancedSearch);
      element.removeEventListener('close', uiStore.closeAdvancedSearch);
      dispose();
    };
  }, [uiStore]);

  return (
    <dialog ref={dialog} open={uiStore.isAdvancedSearchOpen} aria-labelledby="query-builder-label">
      <span aria-hidden="true">{IconSet.SEARCH_EXTENDED}</span>
      <span className="dialog-title">Advanced Search</span>
      <button onClick={uiStore.closeAdvancedSearch} aria-keyshortcuts="Esc">
        <span aria-hidden>{IconSet.CLOSE}</span>
        <span className="visually-hidden">Close</span>
      </button>
      <SearchForm />
    </dialog>
  );
});

export default AdvancedSearchDialog;

const SearchForm = observer(() => {
  const { uiStore, tagStore } = useStore();
  const [form, setForm] = useState(new Map<ID, Query>());

  // Initialize form with current queries. When the form is closed, all inputs
  // are unmounted to save memory.
  useEffect(() => {
    return autorun(() => {
      const map = new Map();
      if (uiStore.isAdvancedSearchOpen) {
        for (const criteria of uiStore.searchCriteriaList) {
          const [id, query] = fromCriteria(criteria);
          map.set(id, query);
        }
      }
      setForm(map);
    });
  }, [uiStore]);

  const add = useRef(() => setForm((form) => new Map(form.set(generateId(), defaultQuery('tags')))))
    .current;

  const search = useCallback(() => {
    uiStore.replaceSearchCriterias(
      Array.from(form.values(), (vals) => intoCriteria(vals, tagStore)),
    );
  }, [form, tagStore, uiStore]);

  const reset = useRef(() => setForm(new Map())).current;

  return (
    <form role="search" method="dialog" onSubmit={search}>
      <fieldset>
        <legend>Criteria Builder</legend>
        TODO
        <button type="button" onClick={add}>
          Add
        </button>
      </fieldset>
      <table>
        <caption>Query Editor</caption>
        <thead className="visually-hidden">
          <tr>
            <td></td>
            <th id="col-key">Key</th>
            <th id="col-operator">Operator</th>
            <th id="col-value">Value</th>
            <th id="col-remove">Remove</th>
          </tr>
        </thead>
        <tbody>
          {Array.from(form.entries(), ([id, query], index) => (
            <Field key={id} index={index} id={id} query={query} dispatch={setForm} />
          ))}
        </tbody>
      </table>

      <RadioGroup name="Match">
        <Radio
          label="Any"
          value="any"
          checked={uiStore.searchMatchAny}
          onChange={uiStore.toggleSearchMatchAny}
        />
        <Radio
          label="All"
          value="all"
          checked={!uiStore.searchMatchAny}
          onChange={uiStore.toggleSearchMatchAny}
        />
      </RadioGroup>

      <button type="reset" onClick={reset}>
        <span aria-hidden="true">{IconSet.CLOSE}</span>
        Reset
      </button>
      <button type="submit">
        <span aria-hidden="true">{IconSet.SEARCH}</span>
        Search
      </button>
    </form>
  );
});
