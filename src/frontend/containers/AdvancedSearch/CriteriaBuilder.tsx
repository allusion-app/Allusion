import React, { RefObject, memo, useState } from 'react';
import { ClientFileSearchCriteria } from 'src/entities/SearchCriteria';
import { FileSearchCriteriaDTO } from 'src/api/FileSearchDTO';
import { IconButton } from 'widgets/Button';
import { IconSet } from 'widgets/Icons';
import { InfoButton } from 'widgets/notifications';
import { KeySelector, OperatorSelector, ValueInput } from './Inputs';

type QueryBuilderProps = {
  keySelector: RefObject<HTMLSelectElement>;
  addCriteria: (criteria: FileSearchCriteriaDTO) => void;
};

const CriteriaBuilder = memo(function CriteriaBuilder({
  keySelector,
  addCriteria,
}: QueryBuilderProps) {
  const [criteria, setCriteria] = useState<FileSearchCriteriaDTO>(() =>
    ClientFileSearchCriteria.tags('contains', []),
  );

  const add = () => {
    addCriteria(criteria);
    setCriteria(ClientFileSearchCriteria.tags('contains', []));
    keySelector.current?.focus();
  };

  return (
    <fieldset aria-labelledby="criteria-builder-label">
      <div style={{ display: 'flex' }}>
        <legend id="criteria-builder-label">Criteria Builder</legend>
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
      </div>
      <div id="criteria-builder">
        <label id="builder-key">Key</label>
        <label id="builder-operator">Operator</label>
        <label id="builder-value">Value</label>
        <span></span>

        <KeySelector
          labelledby="builder-key"
          ref={keySelector}
          criteria={criteria}
          updateCriteria={setCriteria}
        />
        <OperatorSelector labelledby="builder-operator" criteria={criteria} />
        <ValueInput labelledby="builder-value" criteria={criteria} />
        <IconButton text="Add Criteria" icon={IconSet.ADD} onClick={add} />
      </div>
    </fieldset>
  );
});

export default CriteriaBuilder;
