import React, { useCallback, useContext, useMemo, ChangeEvent, useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { DateInput } from '@blueprintjs/datetime';
import {
  FormGroup,
  Button,
  Dialog,
  ControlGroup,
  InputGroup,
  NumericInput,
  HTMLSelect,
} from '@blueprintjs/core';

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
import { IFile, IMG_EXTENSIONS } from '../../../entities/File';
import { jsDateFormatter, camelCaseToSpaced } from '../../utils';
import StoreContext from '../../contexts/StoreContext';
import IconSet from '../../components/Icons';
import { ClientTag } from '../../../entities/Tag';
import TagSelector from '../../components/TagSelector';
import UiStore, { FileSearchCriteria } from '../../UiStore';
import { ClientTagCollection } from '../../../entities/TagCollection';
import { ID } from '../../../entities/ID';

type CriteriaKey = 'name' | 'path' | 'tags' | 'extension' | 'size' | 'dateAdded';
type CriteriaOperator = OperatorType;
type CriteriaValue = string | number | Date | [ID, string] | [ID, string, ID[]] | [];

interface ICriteriaField<
  K extends CriteriaKey,
  O extends CriteriaOperator,
  V extends CriteriaValue
> {
  key: K;
  operator: O;
  value: V;
}

type CriteriaField =
  | ICriteriaField<'name' | 'path', StringOperatorType, string>
  | ICriteriaField<'tags', ArrayOperatorType, [ID, string] | [ID, string, ID[]] | []>
  | ICriteriaField<'extension', BinaryOperatorType, string>
  | ICriteriaField<'size', NumberOperatorType, number>
  | ICriteriaField<'dateAdded', NumberOperatorType, Date>;

const DEFAULT_NAME: CriteriaField = { key: 'name', operator: 'contains', value: '' };
const DEFAULT_PATH: CriteriaField = { key: 'path', operator: 'contains', value: '' };
const DEFAULT_TAGS: CriteriaField = { key: 'tags', operator: 'contains', value: [] };
const DEFAULT_EXTENSION: CriteriaField = {
  key: 'extension',
  operator: 'equals',
  value: IMG_EXTENSIONS[0],
};
const DEFAULT_SIZE: CriteriaField = { key: 'size', operator: 'greaterThanOrEquals', value: 0 };
const DEFAULT_DATE_ADDED: CriteriaField = {
  key: 'dateAdded',
  operator: 'equals',
  value: new Date(),
};

interface IKeySelector {
  selectedKey: CriteriaKey;
  setCriteria: (criteria: CriteriaField) => void;
}

const KeyOptions = [
  { value: 'tags', label: 'Tags' },
  { value: 'name', label: 'File name' },
  { value: 'path', label: 'File path' },
  { value: 'extension', label: 'File type' },
  { value: 'size', label: 'File size (MB)' },
  { value: 'dateAdded', label: 'Date added' },
];

const KeySelector = observer(({ selectedKey, setCriteria }: IKeySelector) => {
  const handlePickKey = useCallback(
    (e: ChangeEvent<HTMLSelectElement>) => {
      const key = e.target.value;
      if (key === 'name') {
        setCriteria({ ...DEFAULT_NAME });
      } else if (key === 'path') {
        setCriteria({ ...DEFAULT_PATH });
      } else if (key === 'extension') {
        setCriteria({ ...DEFAULT_EXTENSION });
      } else if (key === 'tags') {
        setCriteria({ ...DEFAULT_TAGS });
      } else if (key === 'size') {
        setCriteria({ ...DEFAULT_SIZE });
      } else if (key === 'dateAdded') {
        setCriteria({ ...DEFAULT_DATE_ADDED });
      }
    },
    [setCriteria],
  );

  return <HTMLSelect onChange={handlePickKey} options={KeyOptions} defaultValue={selectedKey} />;
});

interface IOperatorSelector {
  selectedKey: CriteriaKey;
  selectedOperator: CriteriaOperator;
  setOperator: (operator: CriteriaOperator) => void;
}

const OperatorOptions = {
  ARRAY: ArrayOperators.map((opt) => ({ value: opt, label: camelCaseToSpaced(opt) })),
  BINARY: BinaryOperators.map((opt) => ({ value: opt, label: camelCaseToSpaced(opt) })),
  NUMBER: NumberOperators.map((opt) => ({ value: opt, label: camelCaseToSpaced(opt) })),
  STRING: StringOperators.map((opt) => ({ value: opt, label: camelCaseToSpaced(opt) })),
};

const OperatorSelector = observer(
  ({ selectedKey, selectedOperator, setOperator }: IOperatorSelector) => {
    const handleSelect = useCallback(
      (e: ChangeEvent<HTMLSelectElement>) => {
        setOperator(e.target.value as CriteriaOperator);
      },
      [setOperator],
    );

    const options = useMemo(() => {
      if (selectedKey === 'dateAdded' || selectedKey === 'size') {
        return OperatorOptions.NUMBER;
      } else if (selectedKey === 'extension') {
        return OperatorOptions.BINARY;
      } else if (selectedKey === 'name' || selectedKey === 'path') {
        return OperatorOptions.STRING;
      } else if (selectedKey === 'tags') {
        return OperatorOptions.ARRAY;
      }
      return [];
    }, [selectedKey]);

    return <HTMLSelect onChange={handleSelect} options={options} defaultValue={selectedOperator} />;
  },
);

interface IValueInput<V extends CriteriaValue> {
  value: V;
  setValue: (value: CriteriaValue) => void;
}

const TagCriteriaItem = observer(
  ({ value, setValue }: IValueInput<[ID, string] | [ID, string, ID[]] | []>) => {
    const { tagStore, tagCollectionStore } = useContext(StoreContext);

    const handleSelectTag = useCallback((t: ClientTag) => setValue([t.id, t.name]), [setValue]);

    const handleSelectCol = useCallback(
      (col: ClientTagCollection) => setValue([col.id, col.name, col.getTagsRecursively()]),
      [setValue],
    );

    const selectedItem = useMemo(() => {
      if (value.length === 2) {
        return tagStore.get(value[0]);
      } else if (value.length === 3) {
        return tagCollectionStore.get(value[0]);
      }
    }, [value, tagStore, tagCollectionStore]);

    return (
      <TagSelector
        selectedItem={selectedItem}
        onTagSelect={handleSelectTag}
        autoFocus
        includeCollections
        onTagColSelect={handleSelectCol}
      />
    );
  },
);

const StringCriteriaItem = observer(({ value, setValue }: IValueInput<string>) => {
  const handleChangeValue = useCallback((e) => setValue(e.target.value), [setValue]);

  return (
    <InputGroup
      placeholder="Enter some text..."
      defaultValue={value}
      onChange={handleChangeValue}
      autoFocus
    />
  );
});

const ExtensionOptions = IMG_EXTENSIONS.map((ext) => ({ value: ext, label: ext.toUpperCase() }));

const ExtensionCriteriaItem = observer(({ value, setValue }: IValueInput<string>) => {
  const handlePickValue = useCallback(
    (e: ChangeEvent<HTMLSelectElement>) => setValue(e.target.value),
    [setValue],
  );

  return <HTMLSelect onChange={handlePickValue} options={ExtensionOptions} defaultValue={value} />;
});

const bytesInMb = 1024 * 1024;
const NumberCriteriaItem = observer(({ value, setValue }: IValueInput<number>) => {
  const handleChangeValue = useCallback((val: number) => setValue(val * bytesInMb), [setValue]);

  return (
    <NumericInput
      placeholder="Enter a number..."
      value={value / bytesInMb}
      onValueChange={handleChangeValue}
      autoFocus
      buttonPosition="none"
    />
  );
});

const DateCriteriaItem = observer(({ value, setValue }: IValueInput<Date>) => {
  return (
    <DateInput
      defaultValue={value}
      onChange={setValue}
      popoverProps={{ inheritDarkTheme: false, minimal: true, position: 'bottom' }}
      canClearSelection={false}
      maxDate={new Date()}
      {...jsDateFormatter}
    />
  );
});

interface ICriteriaItemProps {
  criteria: CriteriaField;
  setCriteria: (replacement: CriteriaField) => void;
  removeCriteria: () => void;
  removable: boolean;
}

// The main Criteria component, finds whatever input fields for the key should be rendered
const CriteriaItem = observer(
  ({ criteria, removeCriteria, removable, setCriteria }: ICriteriaItemProps) => {
    const setOperator = useCallback(
      (operator: CriteriaOperator) => {
        criteria.operator = operator;
      },
      [criteria.operator],
    );

    const setValue = useCallback(
      (value: CriteriaValue) => {
        criteria.value = value;
      },
      [criteria.value],
    );

    const critFields = useMemo(() => {
      if (criteria.key === 'name' || criteria.key === 'path') {
        return <StringCriteriaItem value={criteria.value} setValue={setValue} />;
      } else if (criteria.key === 'tags') {
        return <TagCriteriaItem value={criteria.value} setValue={setValue} />;
      } else if (criteria.key === 'extension') {
        return <ExtensionCriteriaItem value={criteria.value} setValue={setValue} />;
      } else if (criteria.key === 'size') {
        return <NumberCriteriaItem value={criteria.value} setValue={setValue} />;
      } else if (criteria.key === 'dateAdded') {
        return <DateCriteriaItem value={criteria.value} setValue={setValue} />;
      }
      return <p>This should never happen.</p>;
    }, [criteria.key, criteria.value, setValue]);

    return (
      <ControlGroup fill className="criteria">
        <KeySelector selectedKey={criteria.key} setCriteria={setCriteria} />
        <OperatorSelector
          selectedKey={criteria.key}
          selectedOperator={criteria.operator}
          setOperator={setOperator}
        />
        {critFields}
        <Button text="-" onClick={removeCriteria} disabled={!removable} className="remove" />
      </ControlGroup>
    );
  },
);

function fromCriteria(criteria: FileSearchCriteria): CriteriaField | undefined {
  let value: CriteriaValue;
  if (criteria.key === 'name' || criteria.key === 'path' || criteria.key === 'extension') {
    value = (criteria as ClientStringSearchCriteria<IFile>).value;
  } else if (
    criteria.key === 'tags' &&
    criteria instanceof ClientIDSearchCriteria &&
    criteria.value.length > 0
  ) {
    value = [criteria.value[0], criteria.label];
  } else if (criteria.key === 'tags' && criteria instanceof ClientCollectionSearchCriteria) {
    const collection = criteria as ClientCollectionSearchCriteria;
    value = [collection.collectionId, collection.label, collection.value];
  } else if (criteria.key === 'size') {
    value = (criteria as ClientNumberSearchCriteria<IFile>).value;
  } else if (criteria.key === 'dateAdded') {
    value = (criteria as ClientDateSearchCriteria<IFile>).value;
  } else {
    return undefined;
  }
  return { key: criteria.key, operator: criteria.operator, value } as CriteriaField;
}

function intoCriteria(field: CriteriaField): FileSearchCriteria | undefined {
  if (field.key === 'name' || field.key === 'path' || field.key === 'extension') {
    return new ClientStringSearchCriteria(field.key, field.value, field.operator);
  } else if (field.key === 'dateAdded') {
    return new ClientDateSearchCriteria(field.key, field.value, field.operator);
  } else if (field.key === 'size') {
    return new ClientNumberSearchCriteria(field.key, field.value, field.operator);
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
    return undefined;
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
    searchCriteriaList.length > 0
      ? (searchCriteriaList.map(fromCriteria).filter((c) => c !== undefined) as CriteriaField[])
      : [{ ...DEFAULT_TAGS }],
  );

  useEffect(() => {
    openQuickSearch();
  }, [openQuickSearch]);

  const addSearchCriteria = () => setCriterias(criterias.concat({ ...DEFAULT_TAGS }));

  const removeSearchCriteria = (index: number) => {
    criterias.splice(index, 1);
    setCriterias(criterias.slice());
  };

  const setCriteria = (current: number, replacement: CriteriaField) => {
    criterias[current] = replacement;
    setCriterias(criterias.slice());
  };

  const submitSearchCriterias = useCallback(() => {
    replaceSearchCriterias(criterias
      .map(intoCriteria)
      .filter((c) => c !== undefined) as FileSearchCriteria[]);
    closeAdvancedSearch();
  }, [criterias, replaceSearchCriterias, closeAdvancedSearch]);

  const resetSearchCriteria = useCallback(() => {
    clearSearchCriteriaList();
    setCriterias([{ ...DEFAULT_TAGS }]);
  }, [clearSearchCriteriaList]);

  return (
    <div id="search-form">
      <FormGroup>
        {criterias.map((crit, i) => (
          <CriteriaItem
            key={`crit-${i}`}
            criteria={crit}
            setCriteria={setCriteria.bind(null, i)}
            removeCriteria={removeSearchCriteria.bind(null, i)}
            removable={criterias.length !== 1}
          />
        ))}
      </FormGroup>

      <Button icon={IconSet.ADD} onClick={addSearchCriteria} minimal text="Add" />

      <div>
        <div id="actions-bar" className="bp3-alert-footer">
          <Button
            intent="primary"
            onClick={submitSearchCriterias}
            disabled={criterias.length === 0}
            text="Search"
            icon={IconSet.SEARCH}
            fill
          />
          <Button
            onClick={resetSearchCriteria}
            disabled={criterias.length === 0}
            text="Reset"
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
