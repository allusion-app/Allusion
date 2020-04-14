import React, { useContext, useEffect, useReducer, useCallback } from 'react';
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
  id: ID;
  dispatch: Dispatch;
  keyValue: CriteriaKey;
}

const KeyOptions = [
  <option key="tags" value="tags">
    Tags
  </option>,
  <option key="name" value="name">
    File name
  </option>,
  <option key="path" value="path">
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
  <Select
    onChange={(e) => dispatch({ type: 'key', id, value: e.target.value as CriteriaKey })}
    value={keyValue}
  >
    {KeyOptions}
  </Select>
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
  } else if (key === 'name' || key === 'path') {
    return OperatorOptions.STRING;
  } else if (key === 'tags') {
    return OperatorOptions.ARRAY;
  }
  return [];
};

const OperatorSelector = ({ id, keyValue, operator, dispatch }: IOperatorSelector) => (
  <Select
    onChange={(e) => dispatch({ type: 'operator', id, value: e.target.value as CriteriaOperator })}
    value={operator}
  >
    {getOperatorOptions(keyValue)}
  </Select>
);

interface IValueInput<V extends CriteriaValue = CriteriaValue> extends IKeySelector {
  value: V;
}

const TagCriteriaItem = ({ id, value, dispatch }: Omit<IValueInput<TagValue>, 'keyValue'>) => {
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
      onTagSelect={(t) => dispatch({ type: 'value', id, value: [t.id, t.name] })}
      onTagColSelect={(c) =>
        dispatch({ type: 'value', id, value: [c.id, c.name, c.getTagsRecursively()] })
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
  <Select onChange={(e) => dispatch({ type: 'value', id, value: e.target.value })} value={value}>
    {ExtensionOptions}
  </Select>
);

const bytesInMb = 1024 * 1024;

const ValueInput = observer(({ id, keyValue, value, dispatch }: IValueInput) => {
  if (keyValue === 'name' || keyValue === 'path') {
    return (
      <TextInput
        autoFocus
        placeholder="Enter some text..."
        value={value as string}
        setText={(value) => dispatch({ type: 'value', id, value })}
      />
    );
  } else if (keyValue === 'tags') {
    return <TagCriteriaItem id={id} value={value as TagValue} dispatch={dispatch} />;
  } else if (keyValue === 'extension') {
    return <ExtensionCriteriaItem id={id} value={value as string} dispatch={dispatch} />;
  } else if (keyValue === 'size') {
    return (
      <NumberInput
        autoFocus
        placeholder="Enter a number..."
        value={value as number}
        setValue={(value) => dispatch({ type: 'value', id, value })}
      />
    );
  } else if (keyValue === 'dateAdded') {
    return (
      <DateInput
        value={value as Date}
        onChange={(value) => dispatch({ type: 'value', id, value })}
        popoverProps={{ inheritDarkTheme: false, minimal: true, position: 'bottom' }}
        canClearSelection={false}
        maxDate={new Date()}
        {...jsDateFormatter}
      />
    );
  }
  return <p>This should never happen.</p>;
});

interface ICriteriaItemProps {
  criteria: CriteriaField;
  dispatch: Dispatch;
  removable: boolean;
}

// The main Criteria component, finds whatever input fields for the key should be rendered
const CriteriaItem = observer(({ criteria, dispatch, removable }: ICriteriaItemProps) => {
  return (
    <ControlGroup fill className="criteria">
      <KeySelector id={criteria.id} keyValue={criteria.key} dispatch={dispatch} />
      <OperatorSelector
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
        onClick={() => dispatch({ type: 'remove', id: criteria.id })}
        disabled={!removable}
        className="remove"
      />
    </ControlGroup>
  );
});

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

type Action =
  | { type: 'add' | 'reset' }
  | { type: 'key'; id: ID; value: CriteriaKey }
  | { type: 'operator'; id: ID; value: CriteriaOperator }
  | { type: 'value'; id: ID; value: CriteriaValue }
  | { type: 'remove'; id: ID };

const reducer = (state: { items: CriteriaField[] }, action: Action) => {
  switch (action.type) {
    case 'add':
      state.items.push({ ...Default.tags, id: generateId() });
      return { ...state };
    case 'key': {
      const index = state.items.findIndex((i) => i.id === action.id);
      state.items[index] = { ...Default[action.value], id: action.id };
      return { ...state };
    }
    case 'operator': {
      const index = state.items.findIndex((i) => i.id === action.id);
      state.items[index].operator = action.value;
      return { ...state };
    }
    case 'value': {
      const index = state.items.findIndex((i) => i.id === action.id);
      state.items[index].value = action.value;
      return { ...state };
    }
    case 'remove': {
      const index = state.items.findIndex((i) => i.id === action.id);
      state.items.splice(index, 1);
      return { ...state };
    }
    case 'reset':
      return { items: [{ ...Default.tags, id: generateId() }] };
    default:
      return state;
  }
};

type Dispatch = React.Dispatch<Action>;

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
  const [state, dispatch] = useReducer(reducer, {
    items:
      searchCriteriaList.length > 0 ? searchCriteriaList.map(fromCriteria) : [{ ...Default.tags }],
  });

  useEffect(() => {
    openQuickSearch();
  }, [openQuickSearch]);

  const add = useCallback(() => dispatch({ type: 'add' }), []);

  const search = useCallback(() => {
    replaceSearchCriterias(state.items.map(intoCriteria));
    closeAdvancedSearch();
  }, [closeAdvancedSearch, replaceSearchCriterias, state.items]);

  const reset = useCallback(() => {
    clearSearchCriteriaList();
    dispatch({ type: 'reset' });
  }, [clearSearchCriteriaList]);

  return (
    <div id="search-form">
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

      <Button text="Add" icon={IconSet.ADD} onClick={add} minimal />

      <div>
        <div id="actions-bar" className="bp3-alert-footer">
          <Button
            intent="primary"
            text="Search"
            onClick={search}
            disabled={state.items.length === 0}
            icon={IconSet.SEARCH}
            fill
          />
          <Button
            text="Reset"
            onClick={reset}
            disabled={state.items.length === 0}
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
