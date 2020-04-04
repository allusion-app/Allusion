import React, { useCallback, useContext, useMemo, ChangeEvent, useEffect } from 'react';
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
  NumberOperatorType,
  NumberOperators,
  BinaryOperatorType,
  BinaryOperators,
  StringOperatorType,
  StringOperators,
  ArrayOperatorType,
  ArrayOperators,
  ClientStringSearchCriteria,
  ClientArraySearchCriteria,
  ClientNumberSearchCriteria,
  ClientDateSearchCriteria,
  ClientIDSearchCriteria,
  ClientCollectionSearchCriteria,
} from '../../../entities/SearchCriteria';
import { IFile, IMG_EXTENSIONS } from '../../../entities/File';
import { jsDateFormatter, camelCaseToSpaced } from '../../utils';
import StoreContext from '../../contexts/StoreContext';
import IconSet from '../../components/Icons';
import { ClientTag } from '../../../entities/Tag';
import MultiTagSelector from '../../components/MultiTagSelector';
import { FileSearchCriteria } from '../../UiStore';
import { ClientTagCollection } from '../../../entities/TagCollection';

interface IKeyLabel {
  [key: string]: string;
}

export const KeyLabelMap: IKeyLabel = {
  tags: 'Tags',
  name: 'File name',
  path: 'File path',
  extension: 'File type',
  size: 'File size (MB)',
  dateAdded: 'Date added',
};

const CriteriaKeyOrder: Array<keyof IFile> = [
  'tags',
  'name',
  'path',
  'extension',
  'size',
  'dateAdded',
];

export const AdvancedSearchDialog = observer(() => {
  const { uiStore } = useContext(StoreContext);
  const themeClass = uiStore.theme === 'DARK' ? 'bp3-dark' : 'bp3-light';

  return (
    <Dialog
      isOpen={uiStore.isAdvancedSearchOpen}
      onClose={uiStore.toggleAdvancedSearch}
      icon={IconSet.SEARCH_EXTENDED}
      title="Advanced Search"
      // className={themeClass}
      className={`${themeClass} light`}
      canEscapeKeyClose={true}
      canOutsideClickClose={true}
    >
      <SearchForm />
    </Dialog>
  );
});

const KeySelector = observer(({ criteria }: { criteria: FileSearchCriteria }) => {
  const { uiStore } = useContext(StoreContext);
  const handlePickKey = useCallback(
    (e: ChangeEvent<HTMLSelectElement>) => {
      const key = e.target.value as keyof IFile;
      if (key === 'name' || key === 'path' || key === 'extension') {
        const newCrit = new ClientStringSearchCriteria(key);
        uiStore.replaceCriteriaItem(criteria, newCrit);
        if (newCrit.key === 'extension') {
          newCrit.setValue(IMG_EXTENSIONS[0]);
        }
      } else if (key === 'tags') {
        uiStore.replaceCriteriaItem(criteria, new ClientArraySearchCriteria(key));
      } else if (key === 'size') {
        uiStore.replaceCriteriaItem(criteria, new ClientNumberSearchCriteria(key));
      } else if (key === 'dateAdded') {
        uiStore.replaceCriteriaItem(criteria, new ClientDateSearchCriteria(key));
      }
    },
    [criteria, uiStore],
  );

  return (
    <HTMLSelect
      onChange={handlePickKey}
      options={CriteriaKeyOrder.map((key) => ({ value: key, label: KeyLabelMap[key] }))}
      value={criteria.key}
    />
  );
});

interface IOperatorSelectProps {
  onSelect: (sign: string) => void;
  value: string;
  options: readonly string[];
}

const OperatorSelect = ({ onSelect, value, options }: IOperatorSelectProps) => {
  const handleSelect = useCallback(
    (e: ChangeEvent<HTMLSelectElement>) => onSelect(e.target.value),
    [onSelect],
  );
  return (
    <HTMLSelect
      onChange={handleSelect}
      options={options.map((opt) => ({ value: opt, label: camelCaseToSpaced(opt) }))}
      value={value}
    />
  );
};

const TagCriteriaItem = observer(
  ({ criteria }: { criteria: ClientIDSearchCriteria<IFile> | ClientCollectionSearchCriteria }) => {
    const { uiStore, tagStore, tagCollectionStore } = useContext(StoreContext);

    const setOperator = useCallback(
      (operator: string) => criteria.setOperator(operator as ArrayOperatorType),
      [criteria],
    );

    const handleSelectTag = useCallback(
      (t: ClientTag) => {
        if (criteria instanceof ClientIDSearchCriteria) {
          criteria.setValue(t.id, t.name);
        } else {
          uiStore.replaceCriteriaItem(criteria, new ClientIDSearchCriteria('tags', t.id, t.name));
        }
      },
      [criteria, uiStore],
    );
    const handleSelectCol = useCallback(
      (col: ClientTagCollection) => {
        if (criteria instanceof ClientCollectionSearchCriteria) {
          criteria.setValue(col.id, col.getTagsRecursively(), col.name);
        } else {
          uiStore.replaceCriteriaItem(
            criteria,
            new ClientCollectionSearchCriteria(col.id, col.getTagsRecursively(), col.name),
          );
        }
      },
      [criteria, uiStore],
    );

    const handleClear = useCallback(() => {
      if (criteria instanceof ClientIDSearchCriteria) {
        criteria.setValue('', '');
      } else if (criteria instanceof ClientCollectionSearchCriteria) {
        criteria.setValue('', [], '');
      }
    }, [criteria]);

    const selectedItem = useMemo(() => {
      if (criteria instanceof ClientIDSearchCriteria) {
        return criteria.value.length === 1 ? tagStore.get(criteria.value[0]) : undefined;
      } else if (criteria instanceof ClientCollectionSearchCriteria) {
        return tagCollectionStore.get(criteria.collectionId);
      }
    }, [
      tagStore,
      tagCollectionStore,
      criteria,
      // eslint-disable-next-line react-hooks/exhaustive-deps
      criteria instanceof ClientCollectionSearchCriteria ? criteria.collectionId : criteria.value,
    ]);

    return (
      <>
        <OperatorSelect onSelect={setOperator} value={criteria.operator} options={ArrayOperators} />
        <MultiTagSelector
          selectedItems={selectedItem ? [selectedItem] : []}
          onTagSelect={handleSelectTag}
          onTagDeselect={handleClear}
          onClearSelection={handleClear}
          placeholder="Untagged"
          autoFocus
          includeCollections
          onTagColDeselect={handleClear}
          onTagColSelect={handleSelectCol}
        />
      </>
    );
  },
);

const StringCriteriaItem = observer(
  ({ criteria }: { criteria: ClientStringSearchCriteria<IFile> }) => {
    const setOperator = useCallback(
      (operator: string) => criteria.setOperator(operator as StringOperatorType),
      [criteria],
    );
    const handleChangeValue = useCallback((e) => criteria.setValue(e.target.value), [criteria]);
    return (
      <>
        <OperatorSelect
          onSelect={setOperator}
          value={criteria.operator}
          options={StringOperators}
        />
        <InputGroup
          placeholder="Enter some text..."
          value={criteria.value}
          onChange={handleChangeValue}
          autoFocus
        />
      </>
    );
  },
);

const ExtensionCriteriaItem = observer(
  ({ criteria }: { criteria: ClientStringSearchCriteria<IFile> }) => {
    const setOperator = useCallback(
      (operator: string) => criteria.setOperator(operator as BinaryOperatorType),
      [criteria],
    );
    const handlePickValue = useCallback(
      (e: ChangeEvent<HTMLSelectElement>) => criteria.setValue(e.target.value),
      [criteria],
    );

    return (
      <>
        <OperatorSelect
          onSelect={setOperator}
          value={criteria.operator}
          options={BinaryOperators}
        />
        <HTMLSelect
          onChange={handlePickValue}
          options={IMG_EXTENSIONS.map((ext) => ({ value: ext, label: ext.toUpperCase() }))}
          value={criteria.value}
        />
      </>
    );
  },
);

const bytesInMb = 1024 * 1024;
const NumberCriteriaItem = observer(
  ({ criteria }: { criteria: ClientNumberSearchCriteria<IFile> }) => {
    const setOperator = useCallback(
      (operator: string) => criteria.setOperator(operator as NumberOperatorType),
      [criteria],
    );
    const handleChangeValue = useCallback((val: number) => criteria.setValue(val * bytesInMb), [
      criteria,
    ]);
    return (
      <>
        <OperatorSelect
          onSelect={setOperator}
          value={criteria.operator}
          options={NumberOperators}
        />
        <NumericInput
          placeholder="Enter a number..."
          value={criteria.value / bytesInMb}
          onValueChange={handleChangeValue}
          autoFocus
          buttonPosition="none"
        />
      </>
    );
  },
);

const DateCriteriaItem = observer(({ criteria }: { criteria: ClientDateSearchCriteria<IFile> }) => {
  const setOperator = useCallback(
    (operator: string) => criteria.setOperator(operator as NumberOperatorType),
    [criteria],
  );
  const handleChangeValue = useCallback((date: Date) => criteria.setValue(date), [criteria]);
  return (
    <>
      <OperatorSelect onSelect={setOperator} value={criteria.operator} options={NumberOperators} />
      <DateInput
        value={criteria.value}
        onChange={handleChangeValue}
        // timePrecision="minute"
        popoverProps={{ inheritDarkTheme: false, minimal: true, position: 'bottom' }}
        canClearSelection={false}
        maxDate={new Date()}
        // timePickerProps={{ showArrowButtons: true, selectAllOnFocus: true }}
        {...jsDateFormatter}
      />
    </>
  );
});

interface ICriteriaItemProps {
  criteria: FileSearchCriteria;
  onRemove: () => any;
  onAdd: () => any;
  removable: boolean;
}

// The main Criteria component, finds whatever input fields for the key should be rendered
const CriteriaItem = observer(({ criteria, onRemove, removable }: ICriteriaItemProps) => {
  const critFields = useMemo(() => {
    if (criteria.key === 'name' || criteria.key === 'path') {
      return <StringCriteriaItem criteria={criteria as ClientStringSearchCriteria<IFile>} />;
    } else if (criteria.key === 'tags') {
      return <TagCriteriaItem criteria={criteria as ClientIDSearchCriteria<IFile>} />;
    } else if (criteria.key === 'extension') {
      return <ExtensionCriteriaItem criteria={criteria as ClientStringSearchCriteria<IFile>} />;
    } else if (criteria.key === 'size') {
      return <NumberCriteriaItem criteria={criteria as ClientNumberSearchCriteria<IFile>} />;
    } else if (criteria.key === 'dateAdded') {
      return <DateCriteriaItem criteria={criteria as ClientDateSearchCriteria<IFile>} />;
    }
    return <p>This should never happen.</p>;
  }, [criteria]);

  return (
    <ControlGroup fill className="criteria">
      <KeySelector criteria={criteria} />
      {critFields}
      <Button text="-" onClick={onRemove} disabled={!removable} className="remove" />
    </ControlGroup>
  );
});

const SearchForm = observer(() => {
  const { uiStore } = useContext(StoreContext);

  useEffect(() => {
    uiStore.openQuickSearch();
    // Add initial empty criteria if none exist
    if (uiStore.searchCriteriaList.length === 0) {
      uiStore.addSearchCriteria(new ClientArraySearchCriteria('tags'));
    }
  }, [uiStore]);

  const addSearchCriteria = useCallback(
    () => uiStore.addSearchCriteria(new ClientArraySearchCriteria('tags')),
    [uiStore],
  );

  const removeSearchCriteria = useCallback(
    (index: number) => uiStore.removeSearchCriteriaByIndex(index),
    [uiStore],
  );

  const resetSearchCriteria = useCallback(() => {
    uiStore.clearSearchCriteriaList();
    addSearchCriteria();
  }, [addSearchCriteria, uiStore]);

  return (
    <div id="search-form">
      <FormGroup>
        {uiStore.searchCriteriaList.map((crit, i) => (
          <CriteriaItem
            criteria={crit}
            key={`crit-${i}-${crit.key}`}
            onAdd={addSearchCriteria}
            onRemove={removeSearchCriteria.bind(null, i)}
            removable={uiStore.searchCriteriaList.length !== 1}
          />
        ))}
      </FormGroup>

      <Button icon={IconSet.ADD} onClick={addSearchCriteria} minimal text="Add" />

      <div>
        <div id="actions-bar" className="bp3-alert-footer">
          <Button
            intent="primary"
            onClick={uiStore.viewQueryContent}
            disabled={uiStore.searchCriteriaList.length === 0}
            text="Search"
            icon={IconSet.SEARCH}
            fill
          />
          <Button
            onClick={resetSearchCriteria}
            disabled={uiStore.searchCriteriaList.length === 0}
            text="Reset"
            icon={IconSet.CLOSE}
            fill
          />
        </div>
      </div>
    </div>
  );
});
