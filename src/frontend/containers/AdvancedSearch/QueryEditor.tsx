import React, { memo } from 'react';
import { IconSet } from 'widgets/Icons';
import { Callout, InfoButton } from 'widgets/notifications';
import { RadioGroup, Radio } from 'widgets/Radio';
import { FileSearchCriteriaDTO } from 'src/api/FileSearchDTO';
import { KeySelector, OperatorSelector, ValueInput } from './Inputs';

type QueryEditorProps = {
  query: Map<number, FileSearchCriteriaDTO>;
  setQuery: React.Dispatch<React.SetStateAction<Map<number, FileSearchCriteriaDTO>>>;
  submissionButtonText: string;
};

export const QueryEditor = memo(function QueryEditor({
  query,
  setQuery,
  submissionButtonText,
}: QueryEditorProps) {
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
          Your query is currently empty. Create a criteria above to enable the{' '}
          <b>{submissionButtonText}</b> button.
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

type EditableCriteriaProps = {
  index: number;
  id: number;
  criteria: FileSearchCriteriaDTO;
  dispatch: React.Dispatch<React.SetStateAction<Map<number, FileSearchCriteriaDTO>>>;
};

// The main Criteria component, finds whatever input fields for the key should be rendered
export const EditableCriteria = ({ index, id, criteria, dispatch }: EditableCriteriaProps) => {
  const updateCriteria = (update: (criteria: FileSearchCriteriaDTO) => FileSearchCriteriaDTO) => {
    const c = update(criteria);
    dispatch((query) => new Map(query.set(id, c)));
  };

  const removeCriteria = () => {
    dispatch((form) => {
      form.delete(id);
      return new Map(form);
    });
  };

  const criteriaId = `__criteria-${id}`;

  return (
    <tr>
      <th scope="row" id={criteriaId}>
        {index + 1}
      </th>
      <td>
        <KeySelector
          labelledby={`${criteriaId} col-key`}
          criteria={criteria}
          updateCriteria={updateCriteria}
        />
      </td>
      <td>
        <OperatorSelector labelledby={`${criteriaId} col-operator`} criteria={criteria} />
      </td>
      <td>
        <ValueInput labelledby={`${criteriaId} col-value`} criteria={criteria} />
      </td>
      <td>
        <button
          className="btn-icon"
          data-tooltip={`Remove Criteria ${index + 1}`}
          aria-labelledby={`col-remove ${criteriaId}`}
          type="button"
          onClick={removeCriteria}
        >
          <span aria-hidden="true">{IconSet.DELETE}</span>
          <span className="visually-hidden">Remove Criteria</span>
        </button>
      </td>
    </tr>
  );
};

type QueryMatchProps = {
  searchMatchAny: boolean;
  toggle: () => void;
};

export const QueryMatch: React.FC<QueryMatchProps> = ({
  searchMatchAny,
  toggle,
}: QueryMatchProps) => {
  return (
    <RadioGroup name="Match" orientation="horizontal">
      <Radio label="Any" value="any" checked={searchMatchAny} onChange={toggle} />
      <Radio label="All" value="all" checked={!searchMatchAny} onChange={toggle} />
    </RadioGroup>
  );
};
