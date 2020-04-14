import React, { useContext, useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { DateInput } from '@blueprintjs/datetime';
import { FormGroup, Button, Dialog, ControlGroup } from '@blueprintjs/core';

import {
  NumberOperators,
  BinaryOperators,
  StringOperators,
  ArrayOperators,
  ClientStringSearchCriteria,
  ClientNumberSearchCriteria,
  ClientDateSearchCriteria,
  ClientIDSearchCriteria,
  ClientCollectionSearchCriteria,
  StringOperatorType,
  ArrayOperatorType,
  NumberOperatorType,
  OperatorType,
  BinaryOperatorType,
} from '../../../entities/SearchCriteria';
import { IMG_EXTENSIONS } from '../../../entities/File';
import { jsDateFormatter, camelCaseToSpaced } from '../../utils';
import StoreContext from '../../contexts/StoreContext';
import IconSet from '../../components/Icons';
import TagSelector from '../../components/TagSelector';
import UiStore, { FileSearchCriteria } from '../../UiStore';
import { ID, generateId } from '../../../entities/ID';
import { TextInput, NumberInput, Select } from '../../components/form';

type CriteriaKey = 'name' | 'path' | 'tags' | 'extension' | 'size' | 'dateAdded';
type CriteriaOperator = OperatorType;
type TagValue = [ID, string] | [ID, string, ID[]] | [];
type CriteriaValue = string | number | Date | TagValue;

interface ICriteriaField<
  K extends CriteriaKey,
  O extends CriteriaOperator,
  V extends CriteriaValue
> {
  id: ID;
  key: K;
  operator: O;
  value: V;
}

type CriteriaField =
  | ICriteriaField<'name' | 'path', StringOperatorType, string>
  | ICriteriaField<'tags', ArrayOperatorType, TagValue>
  | ICriteriaField<'extension', BinaryOperatorType, string>
  | ICriteriaField<'size', NumberOperatorType, number>
  | ICriteriaField<'dateAdded', NumberOperatorType, Date>;

const Default: { [key: string]: CriteriaField } = {
  name: { id: 'name', key: 'name', operator: 'contains', value: '' },
  path: { id: 'path', key: 'path', operator: 'contains', value: '' },
  tags: { id: 'tags', key: 'tags', operator: 'contains', value: [] },
  extension: {
    id: 'extension',
    key: 'extension',
    operator: 'equals',
    value: IMG_EXTENSIONS[0],
  },
  size: { id: 'size', key: 'size', operator: 'greaterThanOrEquals', value: 0 },
  dateAdded: {
    id: 'dateAdded',
    key: 'dateAdded',
    operator: 'equals',
    value: new Date(),
  },
};

interface IKeySelector {
  keyValue: CriteriaKey;
  setCriteria: (criteria: CriteriaField) => void;
}

const KeySelector = ({ keyValue, setCriteria }: IKeySelector) => (
  <Select
    onChange={(e) => setCriteria({ ...Default[e.target.value as CriteriaKey] })}
    value={keyValue}
  >
    <option key="tags" value="tags">
      Tags
    </option>
    <option key="name" value="name">
      File name
    </option>
    <option key="path" value="path">
      File path
    </option>
    <option key="extension" value="extension">
      File type
    </option>
    <option key="size" value="size">
      File size (MB)
    </option>
    <option key="dateAdded" value="dateAdded">
      Date added
    </option>
  </Select>
);

interface IOperatorSelector {
  keyValue: CriteriaKey;
  operator: CriteriaOperator;
  setOperator: (operator: CriteriaOperator) => void;
}

const toOption = (o: string) => (
  <option key={o} value={o}>
    {camelCaseToSpaced(o)}
  </option>
);

const OperatorOptions = {
  ARRAY: ArrayOperators.map(toOption),
  BINARY: BinaryOperators.map(toOption),
  NUMBER: NumberOperators.map(toOption),
  STRING: StringOperators.map(toOption),
};

const getOperatorOptions = (key: CriteriaKey) => {
  if (key === 'dateAdded' || key === 'size') {
    return OperatorOptions.NUMBER;
  } else if (key === 'extension') {
    return OperatorOptions.BINARY;
  } else if (key === 'name' || key === 'path') {
    return OperatorOptions.STRING;
  } else if (key === 'tags') {
    return OperatorOptions.ARRAY;
  }
  return [];
};

const OperatorSelector = ({ keyValue, operator, setOperator }: IOperatorSelector) => {
  return (
    <Select onChange={(e) => setOperator(e.target.value as CriteriaOperator)} value={operator}>
      {getOperatorOptions(keyValue)}
    </Select>
  );
};

interface IValueInput<V extends CriteriaValue = CriteriaValue> {
  value: V;
  setValue: (value: CriteriaValue) => void;
}

const TagCriteriaItem = ({ value, setValue }: IValueInput<TagValue>) => {
  const { tagStore, tagCollectionStore } = useContext(StoreContext);

  const selectedItem =
    value.length !== 0
      ? value.length === 2
        ? tagStore.get(value[0])
        : tagCollectionStore.get(value[0])
      : undefined;

  return (
    <TagSelector
      autoFocus
      includeCollections
      selectedItem={selectedItem}
      onTagSelect={(t) => setValue([t.id, t.name])}
      onTagColSelect={(c) => setValue([c.id, c.name, c.getTagsRecursively()])}
    />
  );
};

const ExtensionOptions = IMG_EXTENSIONS.map((ext) => (
  <option key={ext} value={ext}>
    {ext.toUpperCase()}
  </option>
));

const ExtensionCriteriaItem = ({ value, setValue }: IValueInput<string>) => {
  return (
    <Select onChange={(e) => setValue(e.target.value)} value={value}>
      {ExtensionOptions}
    </Select>
  );
};

const bytesInMb = 1024 * 1024;

const ValueInput = ({ keyValue, value, setValue }: IValueInput & { keyValue: CriteriaKey }) => {
  if (keyValue === 'name' || keyValue === 'path') {
    return (
      <TextInput
        autoFocus
        placeholder="Enter some text..."
        value={value as string}
        setText={setValue}
      />
    );
  } else if (keyValue === 'tags') {
    return <TagCriteriaItem value={value as TagValue} setValue={setValue} />;
  } else if (keyValue === 'extension') {
    return <ExtensionCriteriaItem value={value as string} setValue={setValue} />;
  } else if (keyValue === 'size') {
    return (
      <NumberInput
        autoFocus
        placeholder="Enter a number..."
        value={value as number}
        setValue={setValue}
      />
    );
  } else if (keyValue === 'dateAdded') {
    return (
      <DateInput
        value={value as Date}
        onChange={setValue}
        popoverProps={{ inheritDarkTheme: false, minimal: true, position: 'bottom' }}
        canClearSelection={false}
        maxDate={new Date()}
        {...jsDateFormatter}
      />
    );
  }
  return <p>This should never happen.</p>;
};

interface ICriteriaItemProps {
  criteria: CriteriaField;
  replace: (replacement: CriteriaField) => void;
  remove: () => void;
  removable: boolean;
}

// The main Criteria component, finds whatever input fields for the key should be rendered
const CriteriaItem = ({ criteria, remove, removable, replace }: ICriteriaItemProps) => {
  return (
    <ControlGroup fill className="criteria">
      <KeySelector keyValue={criteria.key} setCriteria={replace} />
      <OperatorSelector
        keyValue={criteria.key}
        operator={criteria.operator}
        setOperator={(operator) => {
          criteria.operator = operator;
          replace(criteria);
        }}
      />
      <ValueInput
        keyValue={criteria.key}
        value={criteria.value}
        setValue={(value) => {
          criteria.value = value;
          replace(criteria);
        }}
      />
      <Button text="-" onClick={remove} disabled={!removable} className="remove" />
    </ControlGroup>
  );
};

function fromCriteria(criteria: FileSearchCriteria): CriteriaField {
  const c = { ...Default.tags, id: generateId() };
  if (
    criteria instanceof ClientStringSearchCriteria &&
    (criteria.key === 'name' || criteria.key === 'path' || criteria.key === 'extension')
  ) {
    c.value = criteria.value;
  } else if (criteria instanceof ClientDateSearchCriteria && criteria.key === 'dateAdded') {
    c.value = criteria.value;
  } else if (criteria instanceof ClientNumberSearchCriteria && criteria.key === 'size') {
    c.value = criteria.value / bytesInMb;
  } else if (
    criteria instanceof ClientIDSearchCriteria &&
    criteria.key === 'tags' &&
    criteria.value.length > 0
  ) {
    c.value = [criteria.value[0], criteria.label];
  } else if (criteria instanceof ClientCollectionSearchCriteria && criteria.key === 'tags') {
    c.value = [criteria.collectionId, criteria.label, criteria.value];
  } else {
    return c;
  }
  c.key = criteria.key;
  c.operator = criteria.operator;
  return c;
}

function intoCriteria(field: CriteriaField): FileSearchCriteria {
  if (field.key === 'name' || field.key === 'path' || field.key === 'extension') {
    return new ClientStringSearchCriteria(field.key, field.value, field.operator);
  } else if (field.key === 'dateAdded') {
    return new ClientDateSearchCriteria(field.key, field.value, field.operator);
  } else if (field.key === 'size') {
    return new ClientNumberSearchCriteria(field.key, field.value * bytesInMb, field.operator);
  } else if (field.key === 'tags' && field.value.length === 2) {
    return new ClientIDSearchCriteria(field.key, field.value[0], field.value[1], field.operator);
  } else if (field.key === 'tags' && field.value.length === 3) {
    return new ClientCollectionSearchCriteria(
      field.value[0],
      field.value[2],
      field.value[1],
      field.operator,
    );
  } else {
    return new ClientIDSearchCriteria('tags');
  }
}

const SearchForm = ({
  uiStore: {
    searchCriteriaList,
    openQuickSearch,
    replaceSearchCriterias,
    clearSearchCriteriaList,
    closeAdvancedSearch,
  },
}: {
  uiStore: UiStore;
}) => {
  const [criterias, setCriterias] = useState<CriteriaField[]>(
    searchCriteriaList.length > 0 ? searchCriteriaList.map(fromCriteria) : [{ ...Default.tags }],
  );

  useEffect(() => {
    openQuickSearch();
  }, [openQuickSearch]);

  const removeCriteria = (index: number) => {
    criterias.splice(index, 1);
    setCriterias(criterias.slice());
  };

  const replaceCriteria = (current: number, replacement: CriteriaField) => {
    replacement.id = criterias[current].id;
    criterias[current] = replacement;
    setCriterias(criterias.slice());
  };

  return (
    <div id="search-form">
      <FormGroup>
        {criterias.map((crit, i) => (
          <CriteriaItem
            key={crit.id}
            criteria={crit}
            replace={replaceCriteria.bind(null, i)}
            remove={removeCriteria.bind(null, i)}
            removable={criterias.length !== 1}
          />
        ))}
      </FormGroup>

      <Button
        text="Add"
        icon={IconSet.ADD}
        onClick={() => setCriterias(criterias.concat({ ...Default.tags, id: generateId() }))}
        minimal
      />

      <div>
        <div id="actions-bar" className="bp3-alert-footer">
          <Button
            intent="primary"
            text="Search"
            onClick={() => {
              replaceSearchCriterias(criterias.map(intoCriteria));
              closeAdvancedSearch();
            }}
            disabled={criterias.length === 0}
            icon={IconSet.SEARCH}
            fill
          />
          <Button
            text="Reset"
            onClick={() => {
              clearSearchCriteriaList();
              setCriterias([{ ...Default.tags, id: generateId() }]);
            }}
            disabled={criterias.length === 0}
            icon={IconSet.CLOSE}
            fill
          />
        </div>
      </div>
    </div>
  );
};

export const AdvancedSearchDialog = observer(() => {
  const { uiStore } = useContext(StoreContext);
  const themeClass = uiStore.theme === 'DARK' ? 'bp3-dark' : 'bp3-light';

  return (
    <Dialog
      isOpen={uiStore.isAdvancedSearchOpen}
      onClose={uiStore.toggleAdvancedSearch}
      icon={IconSet.SEARCH_EXTENDED}
      title="Advanced Search"
      className={`${themeClass} light`}
      canEscapeKeyClose={true}
      canOutsideClickClose={true}
    >
      <SearchForm uiStore={uiStore} />
    </Dialog>
  );
});
