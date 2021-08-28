import React, { useCallback, useState, useEffect, useRef, memo, RefObject } from 'react';
import { autorun } from 'mobx';
import { observer } from 'mobx-react-lite';

import { ID } from 'src/entities/ID';
import { useStore } from 'src/frontend/contexts/StoreContext';
import { IconSet, RadioGroup, Radio, Button, IconButton } from 'widgets';
import { KeySelector, OperatorSelector, ValueInput } from './Inputs';
import { Criteria, defaultQuery, fromCriteria, generateCriteriaId, intoCriteria } from './data';
import { Dialog } from 'widgets/popovers';
import { Callout, InfoButton } from 'widgets/notifications';

export const AdvancedSearchDialog = observer(() => {
  const { uiStore, tagStore } = useStore();
  const [query, setQuery] = useState(new Map<ID, Criteria>());
  const keySelector = useRef<HTMLSelectElement>(null);

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
        requestAnimationFrame(() => requestAnimationFrame(() => keySelector.current?.focus()));
      }
      setQuery(map);
    });
  }, [uiStore]);

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

        <QueryMatch />

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

interface QueryBuilderProps {
  keySelector: RefObject<HTMLSelectElement>;
  dispatch: QueryDispatch;
}

const CriteriaBuilder = memo(function QueryBuilder({ keySelector, dispatch }: QueryBuilderProps) {
  const [criteria, setCriteria] = useState(defaultQuery('tags'));

  const add = () => {
    dispatch((query) => new Map(query.set(generateCriteriaId(), criteria)));
    setCriteria(defaultQuery('tags'));
    keySelector.current?.focus();
  };

  return (
    <fieldset aria-labelledby="criteria-builder-label">
      <div style={{ display: 'flex' }}>
        <legend id="criteria-builder-label">Criteria Builder</legend>
        <InfoButton>[PLACEHOLDER]</InfoButton>
      </div>
      <div id="criteria-builder">
        <label id="builder-key">Key</label>
        <label id="builder-operator">Operator</label>
        <label id="builder-value">Value</label>
        <span></span>

        <KeySelector
          labelledby="builder-key"
          ref={keySelector}
          keyValue={criteria.key}
          dispatch={setCriteria}
        />
        <OperatorSelector
          labelledby="builder-operator"
          keyValue={criteria.key}
          value={criteria.operator}
          dispatch={setCriteria}
        />
        <ValueInput
          labelledby="builder-value"
          keyValue={criteria.key}
          value={criteria.value}
          dispatch={setCriteria}
        />
        <IconButton text="Add Criteria" icon={IconSet.ADD} onClick={add} />
      </div>
    </fieldset>
  );
});

type Query = Map<string, Criteria>;
type QueryDispatch = React.Dispatch<React.SetStateAction<Query>>;

interface QueryEditorProps {
  query: Query;
  setQuery: QueryDispatch;
}

const QueryEditor = memo(function QueryEditor({ query, setQuery }: QueryEditorProps) {
  return (
    <fieldset aria-labelledby="query-editor-container-label">
      <div style={{ display: 'flex' }}>
        <legend id="query-editor-container-label">Query Editor</legend>
        <InfoButton>[PLACEHOLDER]</InfoButton>
      </div>
      {query.size === 0 ? (
        <Callout icon={IconSet.INFO} header="Empty Query">
          Your query is currently empty. Add a criteria to enable the <em>Search</em> button!
        </Callout>
      ) : undefined}
      <div id="query-editor-container">
        <table id="query-editor">
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
            {Array.from(query.entries(), ([id, query], index) => (
              <EditableCriteria
                key={id}
                index={index}
                id={id}
                criteria={query}
                dispatch={setQuery}
              />
            ))}
          </tbody>
        </table>
      </div>
    </fieldset>
  );
});

interface EditableCriteriaProps {
  index: number;
  id: ID;
  criteria: Criteria;
  dispatch: QueryDispatch;
}

// The main Criteria component, finds whatever input fields for the key should be rendered
export const EditableCriteria = ({ index, id, criteria, dispatch }: EditableCriteriaProps) => {
  const setCriteria = (fn: (criteria: Criteria) => Criteria) => {
    const c = fn(criteria);
    dispatch((query) => new Map(query.set(id, c)));
  };

  return (
    <tr>
      <th scope="row" id={id}>
        {index + 1}
      </th>
      <td>
        <KeySelector labelledby={`${id} col-key`} keyValue={criteria.key} dispatch={setCriteria} />
      </td>
      <td>
        <OperatorSelector
          labelledby={`${id} col-operator`}
          keyValue={criteria.key}
          value={criteria.operator}
          dispatch={setCriteria}
        />
      </td>
      <td>
        <ValueInput
          labelledby={`${id} col-value`}
          keyValue={criteria.key}
          value={criteria.value}
          dispatch={setCriteria}
        />
      </td>
      <td>
        <button
          className="btn-icon"
          data-tooltip={`Remove Criteria ${index + 1}`}
          aria-labelledby={`col-remove ${id}`}
          type="button"
          onClick={() =>
            dispatch((form) => {
              form.delete(id);
              return new Map(form);
            })
          }
        >
          <span aria-hidden="true">{IconSet.DELETE}</span>
          <span className="visually-hidden">Remove Criteria</span>
        </button>
      </td>
    </tr>
  );
};

const QueryMatch = observer(() => {
  const { uiStore } = useStore();

  return (
    <RadioGroup name="Match" orientation="horizontal">
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
  );
});
