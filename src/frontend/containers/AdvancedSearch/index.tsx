import React, { useCallback, useState, useEffect, useRef } from 'react';
import { autorun } from 'mobx';
import { observer } from 'mobx-react-lite';

import { generateId, ID } from 'src/entities/ID';
import { useStore } from 'src/frontend/contexts/StoreContext';
import { IconSet, RadioGroup, Radio } from 'widgets';
import Field from './Field';
import { Query, defaultQuery, fromCriteria, intoCriteria } from './query';
import { Dialog } from 'widgets/popovers';

export const AdvancedSearchDialog = observer(() => {
  const { uiStore } = useStore();

  return (
    <Dialog
      open={uiStore.isAdvancedSearchOpen}
      title="Advanced Search"
      icon={IconSet.SEARCH_EXTENDED}
      onClose={uiStore.closeAdvancedSearch}
    >
      <SearchForm />
    </Dialog>
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
          <span aria-hidden="true">{IconSet.ADD}</span>
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

      <div className="dialog-actions">
        <button className="btn" type="reset" onClick={reset}>
          <span aria-hidden="true">{IconSet.CLOSE}</span>
          Reset
        </button>
        <button className="btn" type="submit">
          <span aria-hidden="true">{IconSet.SEARCH}</span>
          Search
        </button>
      </div>
    </form>
  );
});
