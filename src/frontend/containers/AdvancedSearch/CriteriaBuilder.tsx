import React, { RefObject, memo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { IconButton } from 'widgets/button';
import { IconSet } from 'widgets/icons';
import { InfoButton } from 'widgets/notifications';
import { KeySelector, OperatorSelector, ValueInput } from './Inputs';
import { QueryDispatch } from './QueryEditor';
import { defaultQuery, generateCriteriaId } from './data';

export interface QueryBuilderProps {
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

  const { t } = useTranslation();

  return (
    <fieldset aria-labelledby="criteria-builder-label">
      <legend id="criteria-builder-label">
        {t('search.criteriaBuilder.title')}
        <InfoButton>
          <div>{t('search.criteriaBuilder.helpIntro')}</div>
          <ul>
            <li>
              <b>{t('search.criteriaBuilder.helpKeyTitle')}</b>{' '}
              {t('search.criteriaBuilder.helpKey')}
            </li>
            <li>
              <b>{t('search.criteriaBuilder.helpOperatorTitle')}</b>{' '}
              {t('search.criteriaBuilder.helpOperator')}
            </li>
            <li>
              {t('search.criteriaBuilder.helpValueIntro')}{' '}
              <b>{t('search.criteriaBuilder.helpValue')}</b>.
            </li>
          </ul>
          <div>{t('search.criteriaBuilder.everyMatch')}</div>
          <br />
          <br />
          <div>
            {t('search.criteriaBuilder.addInstruction')}{' '}
            <span aria-label="add criteria" style={{ verticalAlign: 'middle' }}>
              {IconSet.ADD}
            </span>{' '}
            {t('search.criteriaBuilder.addInstruction2')}
          </div>
        </InfoButton>
      </legend>
      <div id="criteria-builder">
        <label id="builder-key">{t('search.criteriaBuilder.labelKey')}</label>
        <label id="builder-operator">{t('search.criteriaBuilder.labelOperator')}</label>
        <label id="builder-value">{t('search.criteriaBuilder.labelValue')}</label>
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
        <IconButton text={t('search.criteriaBuilder.add')} icon={IconSet.ADD} onClick={add} />
      </div>
    </fieldset>
  );
});

export default CriteriaBuilder;
