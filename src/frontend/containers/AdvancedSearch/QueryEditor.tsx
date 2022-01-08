import React, { memo } from 'react';
import { ID } from 'src/entities/ID';
import { IconSet } from 'widgets/Icons';
import { Callout, InfoButton } from 'widgets/notifications';
import { RadioGroup, Radio } from 'widgets/Radio';
import { Criteria } from './data';
import { KeySelector, OperatorSelector, ValueInput } from './Inputs';

export type Query = Map<string, Criteria>;
export type QueryDispatch = React.Dispatch<React.SetStateAction<Query>>;

export interface QueryEditorProps {
  query: Query;
  setQuery: QueryDispatch;
}

export const QueryEditor = memo(function QueryEditor({ query, setQuery }: QueryEditorProps) {
  return (
    <fieldset aria-labelledby="query-editor-container-label">
      <div style={{ display: 'flex' }}>
        <legend id="query-editor-container-label">Query Editor</legend>
        <InfoButton>
          A query is a list of criterias.
          <br />
          <br />
          In the editor you can edit already added criterias by changing the inputs or delete one by
          pressing the{' '}
          <span aria-label="remove criteria" style={{ verticalAlign: 'middle' }}>
            {IconSet.DELETE}
          </span>{' '}
          icon button next to the inputs.
          <br />
          <br />
          Additionally, there is <b>Match</b> option that decides whether all criterias must match
          or just one.
        </InfoButton>
      </div>
      {query.size === 0 ? (
        <Callout icon={IconSet.INFO} header="Empty Query">
          Your query is currently empty. Create a criteria above to enable the <b>Search</b> button.
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

export interface EditableCriteriaProps {
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

interface IQueryMatchProps {
  searchMatchAny: boolean;
  toggle: () => void;
}

export const QueryMatch: React.FC<IQueryMatchProps> = ({
  searchMatchAny,
  toggle,
}: IQueryMatchProps) => {
  return (
    <RadioGroup name="Match" orientation="horizontal">
      <Radio label="Any" value="any" checked={searchMatchAny} onChange={toggle} />
      <Radio label="All" value="all" checked={!searchMatchAny} onChange={toggle} />
    </RadioGroup>
  );
};
