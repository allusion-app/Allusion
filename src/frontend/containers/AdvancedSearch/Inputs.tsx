import { action } from 'mobx';
import React, { ForwardedRef, forwardRef, useState } from 'react';
import { IMG_EXTENSIONS } from 'src/api/File';
import { NumberOperators, StringOperatorType } from 'src/api/DataStorageSearch';
import {
  BinaryOperators,
  NumberOperatorSymbols,
  StringOperatorLabels,
  TagOperators,
} from 'src/api/SearchCriteria';
import { ClientTag } from 'src/entities/Tag';
import { TagSelector } from 'src/frontend/components/TagSelector';
import { useStore } from 'src/frontend/contexts/StoreContext';
import { camelCaseToSpaced } from 'common/fmt';
import { Criteria, defaultQuery, Key, Operator, TagValue, Value } from './data';

type SetCriteria = (fn: (criteria: Criteria) => Criteria) => void;

interface IKeySelector {
  labelledby: string;
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
    <select
      className="criteria-input"
      ref={ref}
      aria-labelledby={labelledby}
      onChange={handleChange}
      value={keyValue}
    >
      <option key="tags" value="tags">
        Tags
      </option>
      <option key="name" value="name">
        File Name
      </option>
      <option key="absolutePath" value="absolutePath">
        File Path
      </option>
      <option key="extension" value="extension">
        File Extension
      </option>
      <option key="size" value="size">
        File Size (MB)
      </option>
      <option key="dateAdded" value="dateAdded">
        Date Added
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
    <select
      className="criteria-input"
      aria-labelledby={labelledby}
      onChange={handleChange}
      value={value}
    >
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
      className="input criteria-input"
      type="text"
      defaultValue={value}
      onBlur={(e) => dispatch(setValue(e.target.value))}
    />
  );
};

const TagInput = ({ value, dispatch }: ValueInput<TagValue>) => {
  const { tagStore } = useStore();
  const [selection, setSelection] = useState(value !== undefined ? tagStore.get(value) : undefined);

  const handleSelect = action((t: ClientTag) => {
    dispatch(setValue(t.id));
    setSelection(t);
  });

  const handleDeselect = () => {
    dispatch(setValue(undefined));
    setSelection(undefined);
  };

  // TODO: tooltips don't work; they're behind the dialog, arghghgh
  return (
    <TagSelector
      selection={selection ? [selection] : []}
      onSelect={handleSelect}
      onDeselect={handleDeselect}
      onClear={handleDeselect}
    />
  );
};

// TODO: needs some more work:
//  - default value of Untagged is unintuitive (you need to manually clear the text field first in order to pick a tag)
//  - and doesn't support large nested tag names well (width of popout is too wide). Maybe already fixed this when reverting to old TagSelector?

// const TagInput = observer(({ labelledby, value, dispatch }: ValueInput<TagValue>) => {
//   const { tagStore } = useStore();
//   const data: TagOptions[] = [
//     { label: 'System Tags', options: [{ id: undefined, name: 'Untagged' }] },
//     { label: 'My Tags', options: tagStore.tagList },
//   ];

//   const handleChange = (v: TagOption) => {
//     const id = v.id;
//     dispatch((criteria) => {
//       criteria.value = id;
//       return { ...criteria };
//     });
//   };

//   return (
//     <GridCombobox
//       value={value}
//       isSelected={(option: TagOption, selection: TagValue) => option.id === selection}
//       onChange={handleChange}
//       data={data}
//       colcount={2}
//       labelFromOption={labelFromOption}
//       renderOption={renderOption}
//       textboxLabelledby={labelledby}
//     />
//   );
// });

// interface TagOptions {
//   label: string;
//   options: readonly TagOption[];
// }

// interface TagOption {
//   id: TagValue;
//   name: string;
// }

// const labelFromOption = action((t: ClientTag) => t.name);

// const renderOption = (tag: TagOption | ClientTag, index: number, selection: boolean) => {
//   if (tag instanceof ClientTag) {
//     return renderTagOption(tag, index, selection);
//   } else {
//     return renderSystemTag(tag, index, selection);
//   }
// };

// const renderSystemTag = (tag: TagOption, index: number, selection: boolean) => {
//   const id = tag.id ?? '';
//   return (
//     <GridOption key={id} rowIndex={index} selected={selection || undefined}>
//       <GridOptionCell id={id} colIndex={1} colspan={2}>
//         {tag.name}
//       </GridOptionCell>
//     </GridOption>
//   );
// };

// const renderTagOption = action((tag: ClientTag, index: number, selection: boolean) => {
//   const id = tag.id;
//   const path = tag.treePath.map((t: ClientTag) => t.name).join(' › ') ?? [];
//   const hint = path.slice(0, Math.max(0, path.length - tag.name.length - 3));

//   return (
//     <GridOption key={id} rowIndex={index} selected={selection || undefined} data-tooltip={path}>
//       <GridOptionCell id={id} colIndex={1}>
//         <span
//           className="combobox-popup-option-icon"
//           style={{ color: tag.viewColor }}
//           aria-hidden={true}
//         >
//           {IconSet.TAG}
//         </span>
//         {tag.name}
//       </GridOptionCell>
//       <GridOptionCell className="tag-option-hint" id={id + '-hint'} colIndex={2}>
//         {hint}
//       </GridOptionCell>
//     </GridOption>
//   );
// });

const ExtensionInput = ({ labelledby, value, dispatch }: ValueInput<string>) => (
  <select
    className="criteria-input"
    aria-labelledby={labelledby}
    onChange={(e) => dispatch(setValue(e.target.value))}
    value={value}
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
      className="input criteria-input"
      type="number"
      defaultValue={value}
      min={0}
      onChange={(e) => {
        const value = e.target.valueAsNumber;
        if (value) {
          dispatch(setValue(value));
        }
      }}
    />
  );
};

const DateAddedInput = ({ value, labelledby, dispatch }: ValueInput<Date>) => {
  return (
    <input
      aria-labelledby={labelledby}
      className="input criteria-input"
      type="date"
      max={new Date().toISOString().slice(0, 10)}
      defaultValue={value.toISOString().slice(0, 10)}
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
