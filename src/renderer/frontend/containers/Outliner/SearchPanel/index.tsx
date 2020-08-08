import React, { useContext, useEffect, useReducer, useCallback } from 'react';
import { observer } from 'mobx-react-lite';
import { DateInput } from '@blueprintjs/datetime';
import {
  FormGroup,
  Button,
  Dialog,
  ControlGroup,
  NumericInput,
  HTMLSelect,
  InputGroup,
  Switch,
  ButtonGroup,
  Classes,
} from '@blueprintjs/core';

import {
  NumberOperators,
  BinaryOperators,
  StringOperators,
  ArrayOperators,
} from 'src/renderer/entities/SearchCriteria';
import { IMG_EXTENSIONS } from 'src/renderer/entities/File';
import { jsDateFormatter, camelCaseToSpaced } from 'src/renderer/frontend/utils';
import StoreContext from 'src/renderer/frontend/contexts/StoreContext';
import IconSet from 'components/Icons';
import TagSelector from 'src/renderer/frontend/components/TagSelector';
import UiStore from 'src/renderer/frontend/stores/UiStore';
import { ID } from 'src/renderer/entities/ID';
import {
  reducer,
  Action,
  Factory,
  fromCriteria,
  intoCriteria,
  defaultState,
  CriteriaKey,
  CriteriaOperator,
  CriteriaValue,
  CriteriaField,
  TagValue,
} from './StateReducer';

import './search.scss';

interface IKeySelector {
  id: ID;
  dispatch: React.Dispatch<Action>;
  keyValue: CriteriaKey;
}

const KeyOptions = [
  <option key="tags" value="tags">
    Tags
  </option>,
  <option key="name" value="name">
    File name
  </option>,
  <option key="absolutePath" value="absolutePath">
    File path
  </option>,
  <option key="extension" value="extension">
    File type
  </option>,
  <option key="size" value="size">
    File size (MB)
  </option>,
  <option key="dateAdded" value="dateAdded">
    Date added
  </option>,
];

const KeySelector = ({ id, keyValue, dispatch }: IKeySelector) => (
  <HTMLSelect
    autoFocus
    onChange={(e) => dispatch(Factory.setKey(id, e.target.value as CriteriaKey))}
    value={keyValue}
  >
    {KeyOptions}
  </HTMLSelect>
);

interface IOperatorSelector extends IKeySelector {
  operator: CriteriaOperator;
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
  } else if (key === 'name' || key === 'absolutePath') {
    return OperatorOptions.STRING;
  } else if (key === 'tags') {
    return OperatorOptions.ARRAY;
  }
  return [];
};

const OperatorSelector = ({ id, keyValue, operator, dispatch }: IOperatorSelector) => (
  <HTMLSelect
    onChange={(e) => dispatch(Factory.setOperator(id, e.target.value as CriteriaOperator))}
    defaultValue={operator}
  >
    {getOperatorOptions(keyValue)}
  </HTMLSelect>
);

interface IValueInput<V extends CriteriaValue = CriteriaValue> extends IKeySelector {
  value: V;
}

const TagCriteriaItem = ({ id, value, dispatch }: Omit<IValueInput<TagValue>, 'keyValue'>) => {
  const { tagStore, tagCollectionStore } = useContext(StoreContext);
  const selectedItem =
    value !== undefined
      ? 'tagId' in value
        ? tagStore.get(value.tagId)
        : tagCollectionStore.get(value.collectionId)
      : undefined;

  return (
    <TagSelector
      autoFocus
      includeCollections
      selectedItem={selectedItem}
      onTagSelect={(t) => dispatch(Factory.setTag(id, t.id, t.name))}
      onTagColSelect={(c) =>
        dispatch(Factory.setCollection(id, c.id, c.getTagsRecursively(), c.name))
      }
    />
  );
};

const ExtensionOptions = IMG_EXTENSIONS.map((ext) => (
  <option key={ext} value={ext}>
    {ext.toUpperCase()}
  </option>
));

const ExtensionCriteriaItem = ({ id, value, dispatch }: Omit<IValueInput<string>, 'keyValue'>) => (
  <HTMLSelect onChange={(e) => dispatch(Factory.setValue(id, e.target.value))} defaultValue={value}>
    {ExtensionOptions}
  </HTMLSelect>
);

const ValueInput = ({ id, keyValue, value, dispatch }: IValueInput) => {
  if (keyValue === 'name' || keyValue === 'absolutePath') {
    return (
      <InputGroup
        autoFocus
        placeholder="Enter some text..."
        defaultValue={value as string}
        onBlur={(e) => dispatch(Factory.setValue(id, e.target.value))}
      />
    );
  } else if (keyValue === 'tags') {
    return <TagCriteriaItem id={id} value={value as TagValue} dispatch={dispatch} />;
  } else if (keyValue === 'extension') {
    return <ExtensionCriteriaItem id={id} value={value as string} dispatch={dispatch} />;
  } else if (keyValue === 'size') {
    return (
      <NumericInput
        autoFocus
        placeholder="Enter a number..."
        defaultValue={value as number}
        onValueChange={(value) => dispatch(Factory.setValue(id, value))}
        buttonPosition="none"
      />
    );
  } else if (keyValue === 'dateAdded') {
    return (
      <DateInput
        defaultValue={value as Date}
        onChange={(value) => dispatch(Factory.setValue(id, value))}
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
  dispatch: React.Dispatch<Action>;
  removable: boolean;
}

// The main Criteria component, finds whatever input fields for the key should be rendered
const CriteriaItem = observer(({ criteria, dispatch, removable }: ICriteriaItemProps) => {
  return (
    <ControlGroup fill className="criteria">
      <KeySelector id={criteria.id} keyValue={criteria.key} dispatch={dispatch} />
      <OperatorSelector
        key={criteria.key}
        id={criteria.id}
        keyValue={criteria.key}
        operator={criteria.operator}
        dispatch={dispatch}
      />
      <ValueInput
        id={criteria.id}
        keyValue={criteria.key}
        value={criteria.value}
        dispatch={dispatch}
      />
      <Button
        text="-"
        onClick={() => dispatch(Factory.removeQuery(criteria.id))}
        disabled={!removable}
        className="remove"
      />
    </ControlGroup>
  );
});

const SearchForm = observer((props: { uiStore: UiStore }) => {
  const {
    uiStore: {
      searchCriteriaList,
      openQuickSearch,
      replaceSearchCriterias,
      clearSearchCriteriaList,
      closeAdvancedSearch,
      searchMatchAny,
      toggleSearchMatchAny,
    },
  } = props;
  const [state, dispatch] = useReducer(reducer, {
    items: searchCriteriaList.length > 0 ? searchCriteriaList.map(fromCriteria) : defaultState(),
  });

  useEffect(() => {
    openQuickSearch();
  }, [openQuickSearch]);

  const add = useCallback(() => dispatch(Factory.addQuery()), []);

  const search = useCallback(() => {
    replaceSearchCriterias(state.items.map(intoCriteria));
    closeAdvancedSearch();
  }, [closeAdvancedSearch, replaceSearchCriterias, state.items]);

  const reset = useCallback(() => {
    clearSearchCriteriaList();
    dispatch(Factory.resetSearch());
  }, [clearSearchCriteriaList]);

  return (
    <div id="search-form">
      <div className={Classes.DIALOG_BODY}>
        <FormGroup>
          {state.items.map((crit) => (
            <CriteriaItem
              key={crit.id}
              criteria={crit}
              dispatch={dispatch}
              removable={state.items.length !== 1}
            />
          ))}
        </FormGroup>
      </div>

      <div className={Classes.DIALOG_FOOTER}>
        <div id="functions-bar">
          <Button text="Add" icon={IconSet.ADD} onClick={add} className="" />
          <Switch
            inline
            large
            label="Match"
            innerLabel="All"
            innerLabelChecked="Any"
            alignIndicator="right"
            checked={searchMatchAny}
            onChange={toggleSearchMatchAny}
          />
        </div>

        <div id="actions-bar">
          <ButtonGroup>
            <Button
              text="Reset"
              onClick={reset}
              disabled={state.items.length === 0}
              icon={IconSet.CLOSE}
              fill
            />
            <Button
              intent="primary"
              text="Search"
              onClick={search}
              disabled={state.items.length === 0}
              icon={IconSet.SEARCH}
              fill
            />
          </ButtonGroup>
        </div>
      </div>
    </div>
  );
});

export const AdvancedSearchDialog = observer(() => {
  const { uiStore } = useContext(StoreContext);
  const themeClass = uiStore.theme === 'DARK' ? 'bp3-dark' : 'bp3-light';

  return (
    <Dialog
      isOpen={uiStore.isAdvancedSearchOpen}
      onClose={uiStore.toggleAdvancedSearch}
      icon={IconSet.SEARCH_EXTENDED}
      title="Advanced Search"
      className={`${themeClass} light header-dark search-dialog`}
      canEscapeKeyClose={true}
      canOutsideClickClose={true}
    >
      <SearchForm uiStore={uiStore} />
    </Dialog>
  );
});
