import React, { useContext, useCallback, useState, useEffect } from 'react';
import { observer } from 'mobx-react-lite';

import {
  NumberOperators,
  BinaryOperators,
  StringOperators,
  ArrayOperators,
  OperatorType,
  StringOperatorType,
  ArrayOperatorType,
  NumberOperatorType,
  BinaryOperatorType,
  ClientStringSearchCriteria,
  ClientIDSearchCriteria,
  ClientDateSearchCriteria,
  ClientNumberSearchCriteria,
} from 'src/renderer/entities/SearchCriteria';
import { IFile, IMG_EXTENSIONS } from 'src/renderer/entities/File';
import { camelCaseToSpaced } from 'src/renderer/frontend/utils';
import StoreContext from 'src/renderer/frontend/contexts/StoreContext';
import { Button, ButtonGroup, IconButton, IconSet, RadioGroup, Radio } from 'components';
import { Dialog } from 'components/popover';
import TagSelector from 'src/renderer/frontend/components/TagSelector';
import { FileSearchCriteria } from 'src/renderer/frontend/stores/UiStore';
import { generateId, ID } from 'src/renderer/entities/ID';
import { ClientTag } from 'src/renderer/entities/Tag';
import { CustomKeyDict } from '../types';

import './search.scss';

type QueryKey = keyof Pick<
  IFile,
  'name' | 'absolutePath' | 'tags' | 'extension' | 'size' | 'dateAdded'
>;
type QueryOperator = OperatorType;
type TagValue = { id: ID; label: string } | undefined;
type QueryValue = string | number | Date | TagValue;

interface IQuery<K extends QueryKey, O extends QueryOperator, V extends QueryValue> {
  key: K;
  operator: O;
  value: V;
}

type Query =
  | IQuery<'name' | 'absolutePath', StringOperatorType, string>
  | IQuery<'tags', ArrayOperatorType, TagValue>
  | IQuery<'extension', BinaryOperatorType, string>
  | IQuery<'size', NumberOperatorType, number>
  | IQuery<'dateAdded', NumberOperatorType, Date>;

/**
 * When a criteria is updated, only the state object is updated to notify React
 * that a change occured. `FormState.fields` is manipulated directly instead.
 * By not re-creating a map on each render, we do not create as much garbage
 * because keys and values do not need to be garbage collected.
 *
 * Additionally, setting `FormState.fields` to readonly ensures that the
 * reference cannot be changed which means the reference exists for the lifetime
 * of the component similar to the mutable reference returned by `useRef`.
 */
type FormState = { readonly fields: Map<string, Query> };
type FormDispatch = React.Dispatch<React.SetStateAction<FormState>>;
type FieldInput<V> = IKeySelector & { value: V };

interface IKeySelector {
  id: ID;
  dispatch: FormDispatch;
  keyValue: QueryKey;
}

const KeySelector = ({ id, keyValue, dispatch }: IKeySelector) => {
  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const key = e.target.value as QueryKey;
    dispatch((form) => {
      let query = form.fields.get(id);
      if (query === undefined) {
        return form;
      }
      // Keep the text value and operator when switching between name and path
      if ([query.key, key].every((k) => ['name', 'absolutePath'].includes(k))) {
        query.key = key;
      } else {
        query = defaultQuery(key);
      }
      form.fields.set(id, query);
      return { ...form };
    });
  };

  return (
    <select autoFocus onChange={handleChange} value={keyValue}>
      <option key="tags" value="tags">
        Tags
      </option>
      <option key="name" value="name">
        File name
      </option>
      <option key="absolutePath" value="absolutePath">
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
    </select>
  );
};

const OperatorOptions = (function () {
  const toOption = (o: string) => (
    <option key={o} value={o}>
      {camelCaseToSpaced(o)}
    </option>
  );
  return {
    ARRAY: ArrayOperators.map(toOption),
    BINARY: BinaryOperators.map(toOption),
    NUMBER: NumberOperators.map(toOption),
    STRING: StringOperators.map(toOption),
  };
})();

const getOperatorOptions = (key: QueryKey) => {
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

const OperatorSelector = ({ id, keyValue, value, dispatch }: FieldInput<QueryOperator>) => {
  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const operator = e.target.value as QueryOperator;
    dispatch((form) => {
      const query = form.fields.get(id);
      if (query === undefined) {
        return form;
      }
      query.operator = operator;
      form.fields.set(id, query);
      return { ...form };
    });
  };

  return (
    <select onChange={handleChange} defaultValue={value}>
      {getOperatorOptions(keyValue)}
    </select>
  );
};

type ValueInput<V> = Omit<FieldInput<V>, 'keyValue'>;

const TagCriteriaItem = ({ id, value, dispatch }: ValueInput<TagValue>) => {
  const { tagStore } = useContext(StoreContext);
  const [selection, setSelection] = useState(
    value !== undefined ? tagStore.get(value.id) : undefined,
  );

  const handleSelect = (t: ClientTag) => {
    dispatch(setValue(id, { id: t.id, label: t.name }));
    setSelection(t);
  };

  return <TagSelector selection={selection} onSelect={handleSelect} />;
};

const ExtensionCriteriaItem = ({ id, value, dispatch }: ValueInput<string>) => (
  <select onChange={(e) => dispatch(setValue(id, e.target.value))} defaultValue={value}>
    {IMG_EXTENSIONS.map((ext) => (
      <option key={ext} value={ext}>
        {ext.toUpperCase()}
      </option>
    ))}
  </select>
);

const ValueInput = ({ id, keyValue, value, dispatch }: FieldInput<QueryValue>) => {
  if (keyValue === 'name' || keyValue === 'absolutePath') {
    return (
      <input
        className="input"
        type="text"
        placeholder="Enter some text..."
        defaultValue={value as string}
        onBlur={(e) => dispatch(setValue(id, e.target.value))}
      />
    );
  } else if (keyValue === 'tags') {
    return <TagCriteriaItem id={id} value={value as TagValue} dispatch={dispatch} />;
  } else if (keyValue === 'extension') {
    return <ExtensionCriteriaItem id={id} value={value as string} dispatch={dispatch} />;
  } else if (keyValue === 'size') {
    return (
      <input
        className="input"
        type="number"
        placeholder="Enter a file size..."
        defaultValue={value as number}
        onChange={(e) => dispatch(setValue(id, e.target.valueAsNumber))}
      />
    );
  } else if (keyValue === 'dateAdded') {
    return (
      <input
        className="input"
        type="date"
        max={new Date().toISOString().substr(0, 10)}
        defaultValue={(value as Date).toISOString().substr(0, 10)}
        onChange={(e) => {
          if (e.target.valueAsDate) {
            dispatch(setValue(id, e.target.valueAsDate));
          }
        }}
      />
    );
  }
  return <p>This should never happen.</p>;
};

interface IFieldProps {
  id: ID;
  query: Query;
  dispatch: FormDispatch;
  removable: boolean;
}

// The main Criteria component, finds whatever input fields for the key should be rendered
const Field = ({ id, query, dispatch, removable }: IFieldProps) => {
  return (
    <fieldset>
      <div className="criteria">
        <KeySelector id={id} keyValue={query.key} dispatch={dispatch} />
        <OperatorSelector id={id} keyValue={query.key} value={query.operator} dispatch={dispatch} />
        <ValueInput id={id} keyValue={query.key} value={query.value} dispatch={dispatch} />
        <Button
          text="-"
          onClick={() =>
            dispatch((form) => {
              form.fields.delete(id);
              return { ...form };
            })
          }
          disabled={!removable}
          styling="filled"
        />
      </div>
    </fieldset>
  );
};

const AdvancedSearchDialog = observer(() => {
  const {
    uiStore: {
      searchCriteriaList,
      replaceSearchCriterias,
      isAdvancedSearchOpen,
      closeAdvancedSearch,
      searchMatchAny,
      toggleSearchMatchAny,
    },
  } = useContext(StoreContext);
  const [form, setForm] = useState<FormState>({ fields: new Map<ID, Query>() });

  // Initialize form with current queries. When the form is closed, all inputs
  // are unmounted to save memory.
  useEffect(() => {
    if (isAdvancedSearchOpen) {
      setForm((form) => {
        if (searchCriteriaList.length > 0) {
          for (const [id, query] of searchCriteriaList.map(fromCriteria)) {
            form.fields.set(id, query);
          }
        } else {
          form.fields.set('tags', defaultQuery('tags'));
        }
        return { ...form };
      });
    } else {
      setForm((form) => {
        form.fields.clear();
        return { ...form };
      });
    }
  }, [isAdvancedSearchOpen, searchCriteriaList]);

  const add = useCallback(() => {
    setForm((form) => {
      form.fields.set(generateId(), defaultQuery('tags'));
      return { ...form };
    });
  }, []);

  const search = useCallback(() => {
    replaceSearchCriterias(Array.from(form.fields.values(), intoCriteria));
    closeAdvancedSearch();
  }, [closeAdvancedSearch, form.fields, replaceSearchCriterias]);

  const reset = useCallback(() => {
    setForm((form) => {
      form.fields.clear();
      form.fields.set(generateId(), defaultQuery('tags'));
      return { ...form };
    });
  }, []);

  return (
    <Dialog
      open={isAdvancedSearchOpen}
      onCancel={closeAdvancedSearch}
      labelledby="dialog-title"
      describedby="search-form"
    >
      <span className="dialog-icon">{IconSet.SEARCH_EXTENDED}</span>
      <h2 id="dialog-title" className="dialog-title">
        Advanced Search
      </h2>
      <IconButton icon={IconSet.CLOSE} text="Close (Esc)" onClick={closeAdvancedSearch} />
      <form id="search-form" className="dialog-information">
        {Array.from(form.fields.entries(), ([id, query]) => (
          <Field
            key={id}
            id={id}
            query={query}
            dispatch={setForm}
            removable={form.fields.size > 1}
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
    </Dialog>
  );
});

export default AdvancedSearchDialog;

const BYTES_IN_MB = 1024 * 1024;

function fromCriteria(criteria: FileSearchCriteria): [ID, Query] {
  const query = defaultQuery('tags');
  if (
    criteria instanceof ClientStringSearchCriteria &&
    (criteria.key === 'name' || criteria.key === 'absolutePath' || criteria.key === 'extension')
  ) {
    query.value = criteria.value;
  } else if (criteria instanceof ClientDateSearchCriteria && criteria.key === 'dateAdded') {
    query.value = criteria.value;
  } else if (criteria instanceof ClientNumberSearchCriteria && criteria.key === 'size') {
    query.value = criteria.value / BYTES_IN_MB;
  } else if (
    criteria instanceof ClientIDSearchCriteria &&
    criteria.key === 'tags' &&
    criteria.value.length > 0
  ) {
    query.value = { id: criteria.value[0], label: criteria.label };
  } else {
    return [generateId(), query];
  }
  query.key = criteria.key;
  query.operator = criteria.operator;
  return [generateId(), query];
}

function intoCriteria(query: Query): FileSearchCriteria {
  if (query.key === 'name' || query.key === 'absolutePath' || query.key === 'extension') {
    return new ClientStringSearchCriteria(query.key, query.value, query.operator, CustomKeyDict);
  } else if (query.key === 'dateAdded') {
    return new ClientDateSearchCriteria(query.key, query.value, query.operator, CustomKeyDict);
  } else if (query.key === 'size') {
    return new ClientNumberSearchCriteria(
      query.key,
      query.value * BYTES_IN_MB,
      query.operator,
      CustomKeyDict,
    );
  } else if (query.key === 'tags' && query.value !== undefined) {
    return new ClientIDSearchCriteria(
      query.key,
      query.value.id,
      query.value.label,
      query.operator,
      CustomKeyDict,
    );
  } else {
    return new ClientIDSearchCriteria('tags');
  }
}

function setValue(id: ID, value: QueryValue): (form: FormState) => FormState {
  return (form: FormState) => {
    const query = form.fields.get(id);
    if (query === undefined) {
      return form;
    }
    query.value = value;
    form.fields.set(id, query);
    return { ...form };
  };
}

function defaultQuery(key: QueryKey): Query {
  if (key === 'name' || key === 'absolutePath') {
    return { key, operator: 'contains', value: '' };
  } else if (key === 'tags') {
    return { key, operator: 'contains', value: undefined };
  } else if (key === 'extension') {
    return {
      key,
      operator: 'equals',
      value: IMG_EXTENSIONS[0],
    };
  } else if (key === 'size') {
    return { key, operator: 'greaterThanOrEquals', value: 0 };
  } else {
    return {
      key,
      operator: 'equals',
      value: new Date(),
    };
  }
}
