import { action } from 'mobx';
import React, { ForwardedRef, forwardRef, useState } from 'react';
import { IMG_EXTENSIONS } from 'src/entities/File';
import {
  BinaryOperators,
  NumberOperators,
  NumberOperatorSymbols,
  StringOperatorLabels,
  StringOperatorType,
  TagOperators,
} from 'src/entities/SearchCriteria';
import { ClientTag } from 'src/entities/Tag';
import { TagSelector } from 'src/frontend/components/TagSelector';
import { useStore } from 'src/frontend/contexts/StoreContext';
import { camelCaseToSpaced } from 'src/frontend/utils';
import { defaultQuery, Criteria, Key, Operator, Value, TagValue } from './data';

type SetCriteria = (fn: (criteria: Criteria) => Criteria) => void;

interface IKeySelector {
  labelledby?: string;
  dispatch: SetCriteria;
  keyValue: Key;
}

export const KeySelector = forwardRef(function KeySelector(
  { labelledby, keyValue, dispatch }: IKeySelector,
  ref: ForwardedRef<HTMLSelectElement>,
) {
  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const key = e.target.value as Key;
    dispatch((criteria) => {
      // Keep the text value and operator when switching between name and path
      if ([criteria.key, key].every((k) => ['name', 'absolutePath'].includes(k))) {
        criteria.key = key;
        return { ...criteria };
      } else {
        return defaultQuery(key);
      }
    });
  };

  return (
    <select ref={ref} aria-labelledby={labelledby} onChange={handleChange} value={keyValue}>
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
});

type FieldInput<V> = IKeySelector & { value: V };

export const OperatorSelector = ({
  labelledby,
  keyValue,
  value,
  dispatch,
}: FieldInput<Operator>) => {
  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const operator = e.target.value as Operator;
    dispatch((criteria) => {
      criteria.operator = operator;
      return { ...criteria };
    });
  };

  return (
    <select aria-labelledby={labelledby} onChange={handleChange} defaultValue={value}>
      {getOperatorOptions(keyValue)}
    </select>
  );
};

export const ValueInput = ({ labelledby, keyValue, value, dispatch }: FieldInput<Value>) => {
  if (keyValue === 'name' || keyValue === 'absolutePath') {
    return <PathInput labelledby={labelledby} value={value as string} dispatch={dispatch} />;
  } else if (keyValue === 'tags') {
    return <TagInput labelledby={labelledby} value={value as TagValue} dispatch={dispatch} />;
  } else if (keyValue === 'extension') {
    return <ExtensionInput labelledby={labelledby} value={value as string} dispatch={dispatch} />;
  } else if (keyValue === 'size') {
    return <SizeInput labelledby={labelledby} value={value as number} dispatch={dispatch} />;
  } else if (keyValue === 'dateAdded') {
    return <DateAddedInput labelledby={labelledby} value={value as Date} dispatch={dispatch} />;
  }
  return <p>This should never happen.</p>;
};

type ValueInput<V> = Omit<FieldInput<V>, 'keyValue'>;

const PathInput = ({ labelledby, value, dispatch }: ValueInput<string>) => {
  return (
    <input
      aria-labelledby={labelledby}
      className="input"
      type="text"
      defaultValue={value}
      onBlur={(e) => dispatch(setValue(e.target.value))}
    />
  );
};

const TagInput = ({ labelledby, value, dispatch }: ValueInput<TagValue>) => {
  const { tagStore } = useStore();
  const [selection, setSelection] = useState(
    value?.id !== undefined ? tagStore.get(value.id) : undefined,
  );

  const handleSelect = action((t: ClientTag) => {
    dispatch(setValue({ id: t.id, label: t.name }));
    setSelection(t);
  });

  const handleDeselect = () => {
    dispatch(setValue(undefined));
    setSelection(undefined);
  };

  return (
    <TagSelector
      labelledby={labelledby}
      multiselectable={false}
      selection={selection ? [selection] : []}
      onSelect={handleSelect}
      onDeselect={handleDeselect}
      onClear={handleDeselect}
    />
  );
};

const ExtensionInput = ({ labelledby, value, dispatch }: ValueInput<string>) => (
  <select
    aria-labelledby={labelledby}
    onChange={(e) => dispatch(setValue(e.target.value))}
    defaultValue={value}
  >
    {IMG_EXTENSIONS.map((ext) => (
      <option key={ext} value={ext}>
        {ext.toUpperCase()}
      </option>
    ))}
  </select>
);

const SizeInput = ({ value, labelledby, dispatch }: ValueInput<number>) => {
  return (
    <input
      aria-labelledby={labelledby}
      className="input"
      type="number"
      defaultValue={value}
      onChange={(e) => dispatch(setValue(e.target.valueAsNumber))}
    />
  );
};

const DateAddedInput = ({ value, labelledby, dispatch }: ValueInput<Date>) => {
  return (
    <input
      aria-labelledby={labelledby}
      className="input"
      type="date"
      max={new Date().toISOString().substr(0, 10)}
      defaultValue={value.toISOString().substr(0, 10)}
      onChange={(e) => {
        if (e.target.valueAsDate) {
          dispatch(setValue(e.target.valueAsDate));
        }
      }}
    />
  );
};

function getOperatorOptions(key: Key) {
  if (key === 'dateAdded' || key === 'size') {
    return NumberOperators.map((op) => toOperatorOption(op, NumberOperatorSymbols));
  } else if (key === 'extension') {
    return BinaryOperators.map((op) => toOperatorOption(op));
  } else if (key === 'name' || key === 'absolutePath') {
    // For performance reasons, we added some extra non-ignoreCase options,
    // but these aren't really needed by the user, so hide them to avoid clutter:
    const shownStringOperators: StringOperatorType[] = [
      'equalsIgnoreCase',
      'notEqual',
      'contains',
      'notContains',
      'startsWithIgnoreCase',
      'notStartsWith',
    ];
    return shownStringOperators.map((op) => toOperatorOption(op, StringOperatorLabels));
  } else if (key === 'tags') {
    return TagOperators.map((op) => toOperatorOption(op));
  }
  return [];
}

const toOperatorOption = <T extends string>(o: T, labels?: Record<T, string>) => (
  <option key={o} value={o}>
    {labels && o in labels ? labels[o] : camelCaseToSpaced(o)}
  </option>
);

function setValue(value: Value): (criteria: Criteria) => Criteria {
  return (criteria: Criteria): Criteria => {
    criteria.value = value;
    return { ...criteria };
  };
}
