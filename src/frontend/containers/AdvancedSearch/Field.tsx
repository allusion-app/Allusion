import { action } from 'mobx';
import React, { useContext, useState } from 'react';
import { IMG_EXTENSIONS } from 'src/entities/File';
import { ID } from 'src/entities/ID';
import {
  BinaryOperators,
  NumberOperators,
  StringOperators,
  TagOperators,
} from 'src/entities/SearchCriteria';
import { ClientTag } from 'src/entities/Tag';
import { MultiTagSelector } from 'src/frontend/components/MultiTagSelector';
import StoreContext from 'src/frontend/contexts/StoreContext';
import { camelCaseToSpaced } from 'src/frontend/utils';
import { IconButton, IconSet } from 'widgets';
import { defaultQuery, Query, QueryKey, QueryOperator, QueryValue, TagValue } from './query';

type FormState = Map<string, Query>;
type FormDispatch = React.Dispatch<React.SetStateAction<FormState>>;

interface IFieldProps {
  id: ID;
  query: Query;
  dispatch: FormDispatch;
  removable: boolean;
}

// The main Criteria component, finds whatever input fields for the key should be rendered
export const Field = ({ id, query, dispatch, removable }: IFieldProps) => (
  <fieldset className="criteria">
    <KeySelector id={id} keyValue={query.key} dispatch={dispatch} />
    <OperatorSelector id={id} keyValue={query.key} value={query.operator} dispatch={dispatch} />
    <ValueInput id={id} keyValue={query.key} value={query.value} dispatch={dispatch} />
    <IconButton
      text="Remove search item"
      icon={IconSet.DELETE}
      onClick={() =>
        dispatch((form) => {
          form.delete(id);
          return new Map(form);
        })
      }
      disabled={!removable}
    />
  </fieldset>
);

export default Field;

interface IKeySelector {
  id: ID;
  dispatch: FormDispatch;
  keyValue: QueryKey;
}

const KeySelector = ({ id, keyValue, dispatch }: IKeySelector) => {
  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const key = e.target.value as QueryKey;
    dispatch((form) => {
      let query = form.get(id);
      if (query === undefined) {
        return form;
      }
      // Keep the text value and operator when switching between name and path
      if ([query.key, key].every((k) => ['name', 'absolutePath'].includes(k))) {
        query.key = key;
      } else {
        query = defaultQuery(key);
      }
      form.set(id, query);
      return new Map(form);
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
        File Extension
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

type FieldInput<V> = IKeySelector & { value: V };

const OperatorSelector = ({ id, keyValue, value, dispatch }: FieldInput<QueryOperator>) => {
  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const operator = e.target.value as QueryOperator;
    dispatch((form) => {
      const query = form.get(id);
      if (query === undefined) {
        return form;
      }
      query.operator = operator;
      return new Map(form).set(id, query);
    });
  };

  return (
    <select onChange={handleChange} defaultValue={value}>
      {getOperatorOptions(keyValue)}
    </select>
  );
};

const ValueInput = ({ id, keyValue, value, dispatch }: FieldInput<QueryValue>) => {
  if (keyValue === 'name' || keyValue === 'absolutePath') {
    return <PathInput id={id} value={value as string} dispatch={dispatch} />;
  } else if (keyValue === 'tags') {
    return <TagInput id={id} value={value as TagValue} dispatch={dispatch} />;
  } else if (keyValue === 'extension') {
    return <ExtensionInput id={id} value={value as string} dispatch={dispatch} />;
  } else if (keyValue === 'size') {
    return <SizeInput id={id} value={value as number} dispatch={dispatch} />;
  } else if (keyValue === 'dateAdded') {
    return <DateAddedInput id={id} value={value as Date} dispatch={dispatch} />;
  }
  return <p>This should never happen.</p>;
};

type ValueInput<V> = Omit<FieldInput<V>, 'keyValue'>;

const PathInput = ({ id, value, dispatch }: ValueInput<string>) => {
  return (
    <input
      className="input"
      type="text"
      placeholder="Enter some text..."
      defaultValue={value}
      onBlur={(e) => dispatch(setValue(id, e.target.value))}
    />
  );
};

const TagInput = ({ id, value, dispatch }: ValueInput<TagValue>) => {
  const { tagStore } = useContext(StoreContext);
  const [selection, setSelection] = useState(
    value?.id !== undefined ? tagStore.get(value.id) : undefined,
  );

  const handleSelect = action((t: ClientTag) => {
    dispatch(setValue(id, { id: t.id, label: t.name }));
    setSelection(t);
  });

  const handleDeselect = () => {
    dispatch(setValue(id, undefined));
    setSelection(undefined);
  };

  return (
    <MultiTagSelector
      selection={selection ? [selection] : []}
      onSelect={handleSelect}
      onDeselect={handleDeselect}
      onClear={handleDeselect}
      placeholder={selection ? undefined : 'Untagged'}
    />
  );
};

const ExtensionInput = ({ id, value, dispatch }: ValueInput<string>) => (
  <select onChange={(e) => dispatch(setValue(id, e.target.value))} defaultValue={value}>
    {IMG_EXTENSIONS.map((ext) => (
      <option key={ext} value={ext}>
        {ext.toUpperCase()}
      </option>
    ))}
  </select>
);

const SizeInput = ({ value, id, dispatch }: ValueInput<number>) => {
  return (
    <input
      className="input"
      type="number"
      placeholder="Enter a file size..."
      defaultValue={value}
      onChange={(e) => dispatch(setValue(id, e.target.valueAsNumber))}
    />
  );
};

const DateAddedInput = ({ value, id, dispatch }: ValueInput<Date>) => {
  return (
    <input
      className="input"
      type="date"
      max={new Date().toISOString().substr(0, 10)}
      defaultValue={value.toISOString().substr(0, 10)}
      onChange={(e) => {
        if (e.target.valueAsDate) {
          dispatch(setValue(id, e.target.valueAsDate));
        }
      }}
    />
  );
};

function getOperatorOptions(key: QueryKey) {
  if (key === 'dateAdded' || key === 'size') {
    return OperatorOptions.NUMBER;
  } else if (key === 'extension') {
    return OperatorOptions.BINARY;
  } else if (key === 'name' || key === 'absolutePath') {
    return OperatorOptions.STRING;
  } else if (key === 'tags') {
    return OperatorOptions.TAG;
  }
  return [];
}

const OperatorOptions = (function () {
  const toOption = (o: string) => (
    <option key={o} value={o}>
      {camelCaseToSpaced(o)}
    </option>
  );
  return {
    TAG: TagOperators.map(toOption),
    BINARY: BinaryOperators.map(toOption),
    NUMBER: NumberOperators.map(toOption),
    STRING: StringOperators.map(toOption),
  };
})();

function setValue(id: ID, value: QueryValue): (form: FormState) => FormState {
  return (form: FormState) => {
    const query = form.get(id);
    if (query === undefined) {
      return form;
    }
    query.value = value;
    form.set(id, query);
    return new Map(form);
  };
}
