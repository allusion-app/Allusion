import React, { useCallback, useContext, useMemo } from 'react';
import { observer } from 'mobx-react-lite';
import { Select, ItemRenderer } from '@blueprintjs/select';
import { DateInput } from '@blueprintjs/datetime';
import {
  FormGroup, Button, ButtonGroup, Dialog, ControlGroup, Checkbox, InputGroup, NumericInput, MenuItem,
} from '@blueprintjs/core';

import MultiTagSelector from './MultiTagSelector';
import StoreContext from '../contexts/StoreContext';
import { ClientTag } from '../../entities/Tag';
import IconSet from './Icons';
import {
  IIDsSearchCriteria, SearchCriteria, SearchCriteriaEqualitySign, IStringSearchCriteria,
  INumberSearchCriteria, IDateSearchCriteria, initStringCriteria, initIDsCriteria, initNumberCriteria,
  initDateCriteria, SearchCriteriaEqualitySignType,
} from '../../entities/SearchCriteria';
import { IFile, IMG_EXTENSIONS } from '../../entities/File';
import { capitalize, jsDateFormatter } from '../utils';

interface IKeyLabel {
  [key: string]: string;
}
const KeyLabelMap: IKeyLabel = {
  name: 'File name',
  path: 'File path',
  extension: 'File type',
  size: 'File size (MB)',
  tags: 'Tags',
  dateAdded: 'Date added',
};

const CriteriaKeyOrder: Array<keyof IFile> = ['name', 'path', 'extension', 'size', 'tags', 'dateAdded'];

const commonSelectProps = {
  popoverProps: { minimal: true },
  openOnKeyDown: false,
};

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
  const handlePickKey = useCallback((key: keyof IFile) => {
    criteria.key = key;
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

  const KeyItemRenderer = useCallback<ItemRenderer<keyof IFile>>(
    (value, { modifiers, handleClick }) => {
      return !modifiers.matchesPredicate ? null : (
        <MenuItem
          key={value}
          text={KeyLabelMap[value]}
          icon={value === criteria.key ? 'tick' : 'blank'}
          active={modifiers.active}
          onClick={handleClick}
          shouldDismissPopover={false}
        />
      );
    },
    [criteria],
  );

  return (
    <Select
      items={CriteriaKeyOrder}
      itemRenderer={KeyItemRenderer}
      onItemSelect={handlePickKey}
      {...commonSelectProps}
    >
      <Button text={KeyLabelMap[criteria.key]} rightIcon="double-caret-vertical" />
    </Select>
  );
});

const TagCriteriaItem = observer(({ criteria }: { criteria: IIDsSearchCriteria<IFile> }) => {
  const { tagStore } = useContext(StoreContext);

  const handleSelectTag = useCallback((t: ClientTag) => criteria.value.push(t.id), [criteria]);

  const handleDeselectTag = useCallback(
    (t: ClientTag) => criteria.value.splice(criteria.value.indexOf(t.id), 1), [criteria]);

  const handleClearTags = useCallback(() => criteria.value.splice(0, criteria.value.length), [criteria]);

  const criteriaTags = useMemo(
    () => criteria.value.map((id) => tagStore.tagList.find((tag) => tag.id === id) as ClientTag),
    [criteria.value.length]);

  return (
    <MultiTagSelector
      selectedTags={criteriaTags}
      onTagSelect={handleSelectTag}
      onTagDeselect={handleDeselectTag}
      onClearSelection={handleClearTags}
      autoFocus
    />
  );
});

const StringCriteriaItem = observer(({ criteria }: { criteria: IStringSearchCriteria<IFile> }) => {
  const handleChangeExact = useCallback((e) => criteria.exact = e.target.value, [criteria]);
  const handleChangeValue = useCallback((e) => criteria.value = e.target.value, [criteria]);
  return (
    <>
      <Checkbox label="Exact" checked={criteria.exact} onChange={handleChangeExact} />
      <InputGroup placeholder="Enter some text..." value={criteria.value} onChange={handleChangeValue} />
    </>
  );
});

const ExtensionCriteriaItem = observer(({ criteria }: { criteria: IStringSearchCriteria<IFile> }) => {
  const handlePickValue = useCallback((value) => criteria.value = value, [criteria]);

  const ExtItemRenderer = useCallback<ItemRenderer<string>>(
    (value, { modifiers, handleClick }) => {
      return !modifiers.matchesPredicate ? null : (
        <MenuItem
          key={value}
          text={value.toUpperCase()}
          icon={value === criteria.value ? 'tick' : 'blank'}
          active={modifiers.active}
          onClick={handleClick}
          shouldDismissPopover={false}
        />
      );
    },
    [criteria],
  );

  return (
    <Select
      items={IMG_EXTENSIONS}
      itemRenderer={ExtItemRenderer}
      onItemSelect={handlePickValue}
      {...commonSelectProps}
    >
      <Button text={criteria.value.toUpperCase()} rightIcon="double-caret-vertical" />
    </Select>
  );
});

interface ISignSelectProps {
  onSelect: (sign: SearchCriteriaEqualitySignType) => void;
  sign: SearchCriteriaEqualitySignType;
}

const SignSelect = ({ onSelect, sign }: ISignSelectProps) => {
  const SignItemRenderer = useCallback<ItemRenderer<SearchCriteriaEqualitySignType>>(
    (value, { modifiers, handleClick }) => {
      return !modifiers.matchesPredicate ? null : (
        <MenuItem
          key={value.toUpperCase()}
          text={capitalize(value)}
          icon={value === sign ? 'tick' : 'blank'}
          active={modifiers.active}
          onClick={handleClick}
          shouldDismissPopover={false}
        />
      );
    },
    [sign],
  );
  return (
    <Select
      items={SearchCriteriaEqualitySign}
      itemRenderer={SignItemRenderer}
      onItemSelect={onSelect}
      {...commonSelectProps}
    >
      <Button text={capitalize(sign)} rightIcon="double-caret-vertical" />
    </Select>
  );
};

const NumberCriteriaItem = observer(({ criteria }: { criteria: INumberSearchCriteria<IFile> }) => {
  const handleChangeSign = useCallback(
    (sign: SearchCriteriaEqualitySignType) => criteria.equalitySign = sign, [criteria]);
  const handleChangeValue = useCallback((e) => criteria.value = e.target.value, [criteria]);
  return (
    <>
      <SignSelect onSelect={handleChangeSign} sign={criteria.equalitySign} />
      <NumericInput placeholder="Enter a number..." value={criteria.value} onChange={handleChangeValue} />
    </>
  );
});

const DateCriteriaItem = observer(({ criteria }: { criteria: IDateSearchCriteria<IFile> }) => {
  const handleChangeSign = useCallback(
    (sign: SearchCriteriaEqualitySignType) => criteria.equalitySign = sign, [criteria]);
  const handleChangeValue = useCallback((date: Date) => criteria.value = date, [criteria]);
  return (
    <>
      <SignSelect onSelect={handleChangeSign} sign={criteria.equalitySign} />
      <DateInput
        value={criteria.value}
        onChange={handleChangeValue}
        timePrecision="minute"
        showActionsBar
        popoverProps={{ inheritDarkTheme: true, minimal: true }}
        disabled={false}
        {...jsDateFormatter}
      />
    </>
  );
});

// The main Criteria component, finds whatever input fields for the key should be rendered
const CriteriaItem = observer(({ criteria }: { criteria: SearchCriteria<IFile> }) => {
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
    <ControlGroup fill>
      <KeySelector criteria={criteria} />
      {critFields}
    </ControlGroup>
  );
});

const SearchForm = observer(() => {
  const { uiStore } = useContext(StoreContext);

  const addSearchQuery = useCallback(
    () => uiStore.addSearchQuery({ key: 'tags', action: 'include', operator: 'or', value: [] }),
    []);

  // Todo: Also search through collections

  return (
    <div id="search-form">
      <FormGroup label="Query">
        {uiStore.searchCriteriaList.map((crit, i) => (
          <CriteriaItem criteria={crit} key={`crit-${i}-${crit.key}`} />
        ))}
      </FormGroup>

      <Button icon={IconSet.ADD} onClick={addSearchQuery} fill text="Query"/>

      <ButtonGroup id="actions-bar">

        <Button
          // intent="warning"
          onClick={uiStore.clearSearchQueryList}
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
