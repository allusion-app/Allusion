import React, { memo } from 'react';
import { useTranslation } from 'react-i18next';

import { ID } from 'src/api/id';
import { IconSet } from 'widgets/icons';
import { Callout, InfoButton } from 'widgets/notifications';
import { Radio, RadioGroup } from 'widgets/radio';
import { KeySelector, OperatorSelector, ValueInput } from './Inputs';
import { Criteria } from './data';

export type Query = Map<string, Criteria>;
export type QueryDispatch = React.Dispatch<React.SetStateAction<Query>>;

export interface QueryEditorProps {
  query: Query;
  setQuery: QueryDispatch;
  submissionButtonText?: string;
}

export const QueryEditor = memo(function QueryEditor({
  query,
  setQuery,
  submissionButtonText = 'Search',
}: QueryEditorProps) {
  const { t } = useTranslation();

  return (
    <fieldset aria-labelledby="query-editor-container-label">
      <div style={{ display: 'flex' }}>
        <legend id="query-editor-container-label">{t('search.queryEditor')}</legend>
        <InfoButton>
          {t('search.queryInfo.part1')}
          <br />
          <br />
          {t('search.queryInfo.part2')}
          <span aria-label="remove criteria" style={{ verticalAlign: 'middle' }}>
            {IconSet.DELETE}
          </span>{' '}
          {t('search.queryInfo.part3')}
          <br />
          <br />
          {t('search.queryInfo.part4')}
        </InfoButton>
      </div>
      {query.size === 0 ? (
        <Callout icon={IconSet.INFO} header={t('search.emptyQuery.header')}>
          {t('search.emptyQuery.body', { action: submissionButtonText })}
        </Callout>
      ) : undefined}
      <div id="query-editor-container">
        <table id="query-editor">
          <thead className="visually-hidden">
            <tr>
              <td></td>
              <th id="col-key">{t('search.table.key')}</th>
              <th id="col-operator">{t('search.table.operator')}</th>
              <th id="col-value">{t('search.table.value')}</th>
              <th id="col-remove">{t('search.table.remove')}</th>
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
          {IconSet.DELETE}
          <span className="visually-hidden">{t('search.removeCriteria')}</span>
        </button>
      </td>
    </tr>
  );
};

type QueryMatchProps = {
  searchMatchAny: boolean;
  toggle: () => void;
};

export const QueryMatch: React.FC<QueryMatchProps> = ({ searchMatchAny, toggle }) => {
  const { t } = useTranslation();
  return (
    <RadioGroup
      name="Match"
      orientation="horizontal"
      value={String(searchMatchAny)}
      onChange={toggle}
    >
      <Radio value="true">{t('search.match.any')}</Radio>
      <Radio value="false">{t('search.match.all')}</Radio>
    </RadioGroup>
  );
};
