import React, { useContext, useReducer, useCallback, useState } from 'react';
import { observer } from 'mobx-react-lite';

import {
  NumberOperators,
  BinaryOperators,
  StringOperators,
  ArrayOperators,
} from 'src/renderer/entities/SearchCriteria';
import { IMG_EXTENSIONS } from 'src/renderer/entities/File';
import { camelCaseToSpaced } from 'src/renderer/frontend/utils';
import StoreContext from 'src/renderer/frontend/contexts/StoreContext';
import { Button, ButtonGroup, IconButton, IconSet, RadioGroup, Radio } from 'components';
import { Dialog } from 'components/popover';
import TagSelector from 'src/renderer/frontend/components/TagSelector';
import UiStore from 'src/renderer/frontend/stores/UiStore';
import { ID } from 'src/renderer/entities/ID';
import { ClientTag } from 'src/renderer/entities/Tag';
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
  <select
    autoFocus
    onChange={(e) => dispatch(Factory.setKey(id, e.target.value as CriteriaKey))}
    value={keyValue}
  >
    {KeyOptions}
  </select>
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
  <select
    onChange={(e) => dispatch(Factory.setOperator(id, e.target.value as CriteriaOperator))}
    defaultValue={operator}
  >
    {getOperatorOptions(keyValue)}
  </select>
);

interface IValueInput<V extends CriteriaValue = CriteriaValue> extends IKeySelector {
  value: V;
}

const TagCriteriaItem = ({ id, value, dispatch }: Omit<IValueInput<TagValue>, 'keyValue'>) => {
  const { tagStore, tagCollectionStore } = useContext(StoreContext);
  const [selection, setSelection] = useState(
    value !== undefined
      ? 'tagId' in value
        ? tagStore.get(value.tagId)
        : tagCollectionStore.get(value.collectionId)
      : undefined,
  );

  return (
    <TagSelector
      selection={selection}
      onSelect={(t) => {
        t instanceof ClientTag
          ? dispatch(Factory.setTag(id, t.id, t.name))
          : dispatch(Factory.setCollection(id, t.id, t.getTagsRecursively(), t.name));
        setSelection(t);
      }}
    />
  );
};

const ExtensionOptions = IMG_EXTENSIONS.map((ext) => (
  <option key={ext} value={ext}>
    {ext.toUpperCase()}
  </option>
));

const ExtensionCriteriaItem = ({ id, value, dispatch }: Omit<IValueInput<string>, 'keyValue'>) => (
  <select onChange={(e) => dispatch(Factory.setValue(id, e.target.value))} defaultValue={value}>
    {ExtensionOptions}
  </select>
);

const ValueInput = ({ id, keyValue, value, dispatch }: IValueInput) => {
  if (keyValue === 'name' || keyValue === 'absolutePath') {
    return (
      <input
        autoFocus
        type="text"
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
      <input
        autoFocus
        type="number"
        placeholder="Enter a file size..."
        defaultValue={value as number}
        onChange={(e) => dispatch(Factory.setValue(id, e.target.valueAsNumber))}
      />
    );
  } else if (keyValue === 'dateAdded') {
    return (
      <input
        autoFocus
        type="date"
        max={new Date().toISOString().substr(0, 10)}
        defaultValue={(value as Date).toISOString().substr(0, 10)}
        onChange={(e) => {
          if (e.target.valueAsDate) {
            dispatch(Factory.setValue(id, e.target.valueAsDate));
          }
        }}
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
    <fieldset>
      <div className="criteria">
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
          styling="filled"
        />
      </div>
    </fieldset>
  );
});

const SearchForm = observer((props: { uiStore: UiStore }) => {
  const {
    uiStore: {
      searchCriteriaList,
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
    <>
      <form id="search-form" className="dialog-information">
        {state.items.map((crit) => (
          <CriteriaItem
            key={crit.id}
            criteria={crit}
            dispatch={dispatch}
            removable={state.items.length > 1}
          />
        ))}
      </form>
      <div className="dialog-footer">
        <div id="functions-bar">
          <Button text="Add" icon={IconSet.ADD} onClick={add} styling="outlined" />
          <RadioGroup name="Match">
            <Radio
              label="Any"
              value="any"
              checked={searchMatchAny}
              onChange={toggleSearchMatchAny}
            />
            <Radio
              label="All"
              value="all"
              checked={!searchMatchAny}
              onChange={toggleSearchMatchAny}
            />
          </RadioGroup>
        </div>
        <ButtonGroup className="dialog-actions">
          <Button text="Reset" onClick={reset} icon={IconSet.CLOSE} styling="outlined" />
          <Button text="Search" onClick={search} icon={IconSet.SEARCH} styling="filled" />
        </ButtonGroup>
      </div>
    </>
  );
});

const AdvancedSearchDialog = observer(() => {
  const { uiStore } = useContext(StoreContext);

  return (
    <Dialog
      open={uiStore.isAdvancedSearchOpen}
      onCancel={uiStore.closeAdvancedSearch}
      labelledby="dialog-title"
      describedby="search-form"
    >
      <span className="dialog-icon">{IconSet.SEARCH_EXTENDED}</span>
      <h2 id="dialog-title" className="dialog-title">
        Advanced Search
      </h2>
      <IconButton icon={IconSet.CLOSE} text="Close (Esc)" onClick={uiStore.closeAdvancedSearch} />
      <SearchForm uiStore={uiStore} />
    </Dialog>
  );
});

export default AdvancedSearchDialog;