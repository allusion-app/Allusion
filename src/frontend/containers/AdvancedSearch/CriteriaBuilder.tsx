import React, { RefObject, memo, useState } from 'react';
import { IconButton } from 'widgets/Button';
import { IconSet } from 'widgets/Icons';
import { InfoButton } from 'widgets/notifications';
import { defaultQuery, generateCriteriaId } from './data';
import { KeySelector, OperatorSelector, ValueInput } from './Inputs';
import { QueryDispatch } from './QueryEditor';

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

  return (
    <fieldset aria-labelledby="criteria-builder-label">
      <legend id="criteria-builder-label">
        Criteria Builder
        <InfoButton>
          A criteria is made of three components:
          <ul>
            <li>
              <b>key</b> (a property of the image file),
            </li>
            <li>
              <b>operator</b> (decides how the property value is compared) and
            </li>
            <li>
              the matching <b>value</b>.
            </li>
          </ul>
          Every image that matches the criteria is shown.
          <br />
          <br />
          You can edit the inputs for each component and add the criteria to the query by pressing
          the{' '}
          <span aria-label="add criteria" style={{ verticalAlign: 'middle' }}>
            {IconSet.ADD}
          </span>{' '}
          icon button next to the inputs.
        </InfoButton>
      </legend>
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

export default CriteriaBuilder;
