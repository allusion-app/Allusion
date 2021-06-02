import React, { useCallback, useState, useEffect, useRef } from 'react';
import { runInAction } from 'mobx';
import { observer } from 'mobx-react-lite';

import { generateId, ID } from 'src/entities/ID';
import { useStore } from 'src/frontend/contexts/StoreContext';
import { Button, IconButton, IconSet, RadioGroup, Radio } from 'widgets';
import { Dialog } from 'widgets/popovers';
import Field from './Field';
import { Query, defaultQuery, fromCriteria, intoCriteria } from './query';

import './search.scss';

export const AdvancedSearchDialog = observer(() => {
  const { uiStore, tagStore } = useStore();
  const { searchCriteriaList, isAdvancedSearchOpen } = uiStore;
  const [form, setForm] = useState(new Map<ID, Query>());

  // Initialize form with current queries. When the form is closed, all inputs
  // are unmounted to save memory.
  useEffect(() => {
    if (isAdvancedSearchOpen) {
      const map = new Map();
      runInAction(() => {
        if (searchCriteriaList.length > 0) {
          for (const criteria of searchCriteriaList) {
            const [id, query] = fromCriteria(criteria);
            map.set(id, query);
          }
        } else {
          map.set('tags', defaultQuery('tags'));
        }
      });
      setForm(map);
    } else {
      setForm(new Map());
    }
  }, [isAdvancedSearchOpen, searchCriteriaList]);

  const add = useRef(() => setForm((f) => new Map(f.set(generateId(), defaultQuery('tags')))))
    .current;

  const search = useCallback(() => {
    uiStore.replaceSearchCriterias(
      Array.from(form.values(), (vals) => intoCriteria(vals, tagStore)),
    );
    uiStore.closeAdvancedSearch();
  }, [form, tagStore, uiStore]);

  const reset = useRef(() => setForm(new Map().set(generateId(), defaultQuery('tags')))).current;

  return (
    <Dialog
      open={isAdvancedSearchOpen}
      onCancel={uiStore.closeAdvancedSearch}
      labelledby="dialog-title"
      describedby="search-form"
    >
      <span className="dialog-icon">{IconSet.SEARCH_EXTENDED}</span>
      <h2 id="dialog-title" className="dialog-title">
        Advanced Search
      </h2>
      <IconButton icon={IconSet.CLOSE} text="Close (Esc)" onClick={uiStore.closeAdvancedSearch} />
      <form
        role="search"
        id="search-form"
        className="dialog-information"
        onSubmit={(e) => e.preventDefault()}
      >
        {Array.from(form.entries(), ([id, query]) => (
          <Field key={id} id={id} query={query} dispatch={setForm} removable={form.size > 1} />
        ))}
        <div className="dialog-footer">
          <div id="functions-bar">
            <Button text="Add" icon={IconSet.ADD} onClick={add} styling="outlined" />
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
          </div>
          <div className="btn-group dialog-actions">
            <Button text="Reset" onClick={reset} icon={IconSet.CLOSE} styling="outlined" />
            <Button text="Search" onClick={search} icon={IconSet.SEARCH} styling="filled" />
          </div>
        </div>
      </form>
    </Dialog>
  );
});

export default AdvancedSearchDialog;
