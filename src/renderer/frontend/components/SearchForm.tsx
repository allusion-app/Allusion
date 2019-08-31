import React, { useCallback, useContext, useMemo, ChangeEvent } from 'react';
import { observer } from 'mobx-react-lite';
import { DateInput } from '@blueprintjs/datetime';
import {
  FormGroup, Button, ButtonGroup, Dialog, ControlGroup, InputGroup, NumericInput, HTMLSelect,
} from '@blueprintjs/core';

import MultiTagSelector from './MultiTagSelector';
import StoreContext from '../contexts/StoreContext';
import { ClientTag } from '../../entities/Tag';
import IconSet from './Icons';
import {
  IIDsSearchCriteria, SearchCriteria, IStringSearchCriteria,
  INumberSearchCriteria, IDateSearchCriteria, initStringCriteria, initIDsCriteria, initNumberCriteria,
  initDateCriteria,
  NumberOperatorType, NumberOperators,
  BinaryOperatorType, BinaryOperators,
  StringOperatorType, StringOperators,
  ArrayOperatorType, ArrayOperators,
} from '../../entities/SearchCriteria';
import { IFile, IMG_EXTENSIONS } from '../../entities/File';
import { jsDateFormatter, camelCaseToSpaced } from '../utils';

interface IKeyLabel {
  [key: string]: string;
}
export const KeyLabelMap: IKeyLabel = {
  name: 'File name',
  path: 'File path',
  extension: 'File type',
  size: 'File size (MB)',
  tags: 'Tags',
  dateAdded: 'Date added',
};

const CriteriaKeyOrder: Array<keyof IFile> = ['name', 'path', 'extension', 'size', 'tags', 'dateAdded'];

export const AdvancedSearchDialog = observer(() => {
  const { uiStore } = useContext(StoreContext);
  const themeClass = uiStore.theme === 'DARK' ? 'bp3-dark' : 'bp3-light';

  return (
    <Dialog
      isOpen={uiStore.isAdvancedSearchOpen}
      onClose={uiStore.toggleAdvancedSearch}
      icon={IconSet.SEARCH}
      title="Advanced Search"
      className={themeClass}
      canOutsideClickClose={false}
    >
      <SearchForm />
    </Dialog>
  );
});

const KeySelector = observer(({ criteria }: { criteria: SearchCriteria<IFile> }) => {
  const handlePickKey = useCallback((e: ChangeEvent<HTMLSelectElement>) => {
    criteria.key = e.target.value as keyof IFile;
    if (criteria.key === 'name') {
      initStringCriteria(criteria);
    } else if (criteria.key === 'path') {
      initStringCriteria(criteria);
    } else if (criteria.key === 'tags') {
      initIDsCriteria(criteria);
    } else if (criteria.key === 'extension') {
      initStringCriteria(criteria);
      criteria.value = IMG_EXTENSIONS[0];
    } else if (criteria.key === 'size') {
      initNumberCriteria(criteria);
    } else if (criteria.key === 'dateAdded') {
      initDateCriteria(criteria);
    }
  }, [criteria]);

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
  const handleSelect = useCallback((e: ChangeEvent<HTMLSelectElement>) => onSelect(e.target.value), [onSelect]);
  return (
    <HTMLSelect
      onChange={handleSelect}
      options={options.map((opt) => ({ value: opt, label: camelCaseToSpaced(opt) }))}
      value={value}
    />
  );
};

const TagCriteriaItem = observer(({ criteria }: { criteria: IIDsSearchCriteria<IFile> }) => {
  const { tagStore } = useContext(StoreContext);

  const setOperator = useCallback(
    (operator: string) => criteria.operator = operator as ArrayOperatorType, [criteria]);

  const handleSelectTag = useCallback((t: ClientTag) => criteria.value.push(t.id), [criteria]);

  const handleDeselectTag = useCallback(
    (t: ClientTag) => criteria.value.splice(criteria.value.indexOf(t.id), 1), [criteria]);

  const handleClearTags = useCallback(() => criteria.value.splice(0, criteria.value.length), [criteria]);

  const criteriaTags = useMemo(
    () => criteria.value.map((id) => tagStore.tagList.find((tag) => tag.id === id) as ClientTag),
    [criteria.value.length]);

  return (
    <>
      <OperatorSelect onSelect={setOperator} value={criteria.operator} options={ArrayOperators} />
      <MultiTagSelector
        selectedTags={criteriaTags}
        onTagSelect={handleSelectTag}
        onTagDeselect={handleDeselectTag}
        onClearSelection={handleClearTags}
        placeholder="Untagged"
        autoFocus
      />
    </>
  );
});

const StringCriteriaItem = observer(({ criteria }: { criteria: IStringSearchCriteria<IFile> }) => {
  const setOperator = useCallback(
    (operator: string) => criteria.operator = operator as StringOperatorType, [criteria]);
  const handleChangeValue = useCallback((e) => criteria.value = e.target.value, [criteria]);
  return (
    <>
      <OperatorSelect onSelect={setOperator} value={criteria.operator} options={StringOperators} />
      <InputGroup placeholder="Enter some text..." value={criteria.value} onChange={handleChangeValue} autoFocus />
    </>
  );
});

const ExtensionCriteriaItem = observer(({ criteria }: { criteria: IStringSearchCriteria<IFile> }) => {
  const setOperator = useCallback(
    (operator: string) => criteria.operator = operator as BinaryOperatorType, [criteria]);
  const handlePickValue = useCallback(
    (e: ChangeEvent<HTMLSelectElement>) => criteria.value = e.target.value, [criteria]);

  return (
    <>
      <OperatorSelect onSelect={setOperator} value={criteria.operator} options={BinaryOperators} />
      <HTMLSelect
        onChange={handlePickValue}
        options={IMG_EXTENSIONS.map((ext) => ({ value: ext, label: ext.toUpperCase() }))}
        value={criteria.value}
      />
    </>
  );
});

const NumberCriteriaItem = observer(({ criteria }: { criteria: INumberSearchCriteria<IFile> }) => {
  const setOperator = useCallback(
    (operator: string) => criteria.operator = operator as NumberOperatorType, [criteria]);
  const handleChangeValue = useCallback((e) => criteria.value = e.target.value, [criteria]);
  return (
    <>
      <OperatorSelect onSelect={setOperator} value={criteria.operator} options={NumberOperators} />
      <NumericInput placeholder="Enter a number..." value={criteria.value} onChange={handleChangeValue} autoFocus />
    </>
  );
});

const DateCriteriaItem = observer(({ criteria }: { criteria: IDateSearchCriteria<IFile> }) => {
  const setOperator = useCallback(
    (operator: string) => criteria.operator = operator as NumberOperatorType, [criteria]);
  const handleChangeValue = useCallback((date: Date) => criteria.value = date, [criteria]);
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
  criteria: SearchCriteria<IFile>;
  onRemove: () => any;
  onAdd: () => any;
}

// The main Criteria component, finds whatever input fields for the key should be rendered
const CriteriaItem = observer(({ criteria, onRemove, onAdd }: ICriteriaItemProps) => {

  const critFields = useMemo(() => {
    if (criteria.key === 'name' || criteria.key === 'path') {
      return <StringCriteriaItem criteria={criteria as IStringSearchCriteria<IFile>} />;
    } else if (criteria.key === 'tags') {
      return <TagCriteriaItem criteria={criteria as IIDsSearchCriteria<IFile>} />;
    } else if (criteria.key === 'extension') {
      return <ExtensionCriteriaItem criteria={criteria as IStringSearchCriteria<IFile>} />;
    } else if (criteria.key === 'size') {
      return <NumberCriteriaItem criteria={criteria as INumberSearchCriteria<IFile>} />;
    } else if (criteria.key === 'dateAdded') {
      return <DateCriteriaItem criteria={criteria as IDateSearchCriteria<IFile>} />;
    }
    return <p>This should never happen.</p>;
  }, [criteria.key]);

  return (
    <ControlGroup fill className="criteria">
      <KeySelector criteria={criteria} />
      {critFields}

      <ButtonGroup vertical className="add-remove">
        <Button text="-" onClick={onRemove} />
        <Button text="+" onClick={onAdd} />
      </ButtonGroup>
    </ControlGroup>
  );
});

const SearchForm = observer(() => {
  const { uiStore } = useContext(StoreContext);

  const addSearchQuery = useCallback(
    () => uiStore.addSearchQuery(initIDsCriteria({ key: 'tags', operator: 'contains', valueType: 'array', value: [] })),
    []);

  const removeSearchQuery = useCallback((index: number) => uiStore.searchCriteriaList.splice(index, 1), []);

  const resetSearchCriteria = useCallback(() => {
    uiStore.clearSearchQueryList();
    addSearchQuery();
  }, []);

  // Todo: Also search through collections

  return (
    <div id="search-form">
      <FormGroup>
        {uiStore.searchCriteriaList.map((crit, i) => (
          <CriteriaItem
            criteria={crit} key={`crit-${i}-${crit.key}`}
            onAdd={addSearchQuery}
            onRemove={removeSearchQuery.bind(null, i)}
          />
        ))}
      </FormGroup>

      {/* <Button icon={IconSet.ADD} onClick={addSearchQuery} fill text="Query"/> */}

      <ButtonGroup id="actions-bar">

        <Button
          onClick={resetSearchCriteria}
          disabled={uiStore.searchCriteriaList.length === 0}
          text="Reset"
          icon={IconSet.CLOSE}
          fill
        />
        <Button
          intent="primary"
          onClick={uiStore.viewContentQuery}
          disabled={uiStore.searchCriteriaList.length === 0}
          text="Search"
          icon={IconSet.SEARCH}
          fill
        />
      </ButtonGroup>
    </div>
  );
});

export default SearchForm;
