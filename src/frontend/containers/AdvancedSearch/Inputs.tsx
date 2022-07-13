import { action, computed } from 'mobx';
import React, { ForwardedRef, useMemo } from 'react';
import { IMG_EXTENSIONS, IMG_EXTENSIONS_TYPE } from 'src/api/FileDTO';
import {
  BinaryOperators,
  ExtensionSearchCriteria,
  Operators,
  PathSearchCriteria,
  SearchableFileData,
  TagSearchCriteria,
  TreeOperators,
} from 'src/api/FileSearchDTO';
import {
  NumberOperators,
  StringOperatorType,
  DateSearchCriteria,
  NumberSearchCriteria,
} from 'src/api/SearchCriteriaDTO';
import { ClientFileSearchCriteria } from 'src/entities/SearchCriteria';
import { FileSearchCriteriaDTO } from 'src/api/FileSearchDTO';
import { ClientTag } from 'src/entities/Tag';
import { TagSelector } from 'src/frontend/components/TagSelector';
import { useStore } from 'src/frontend/contexts/StoreContext';
import { camelCaseToSpaced } from 'common/fmt';
import { observer } from 'mobx-react-lite';
import { useAction, useComputed } from 'src/frontend/hooks/mobx';
import { getNumberOperatorSymbol, getStringOperatorLabel } from 'src/frontend/stores/SearchStore';

type KeySelectorProps = {
  labelledby: string;
  updateCriteria: (update: (criteria: FileSearchCriteriaDTO) => FileSearchCriteriaDTO) => void;
  criteria: FileSearchCriteriaDTO;
};

export const KeySelector = observer(
  function KeySelector(
    { labelledby, criteria, updateCriteria }: KeySelectorProps,
    ref: ForwardedRef<HTMLSelectElement>,
  ) {
    const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      const key = e.target.value as FileSearchCriteriaDTO['key'];
      const update = action(changeCriteriaKey);
      updateCriteria((criteria) => update(key, criteria));
    };

    return (
      <select
        className="criteria-input"
        ref={ref}
        aria-labelledby={labelledby}
        onChange={handleChange}
        value={criteria.key}
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
  },
  { forwardRef: true },
);

type Input<V> = { labelledby: string; criteria: V };

export const OperatorSelector = observer(
  ({ labelledby, criteria }: Input<FileSearchCriteriaDTO>) => {
    const handleChange = useMemo(
      () =>
        action((e: React.ChangeEvent<HTMLSelectElement>) => {
          criteria.operator = e.target.value as Operators;
        }),
      [criteria],
    );

    const [values, formatter] = useMemo(
      () => computed(() => getOperatorOptions(criteria.key)),
      [criteria],
    ).get();

    return (
      <select
        className="criteria-input"
        aria-labelledby={labelledby}
        onChange={handleChange}
        value={criteria.operator}
      >
        {values.map((value) => (
          <option key={value} value={value}>
            {formatter(value)}
          </option>
        ))}
      </select>
    );
  },
);

export const ValueInput = observer(({ labelledby, criteria }: Input<FileSearchCriteriaDTO>) => {
  switch (criteria.key) {
    case 'tags':
      return <TagInput labelledby={labelledby} criteria={criteria} />;

    case 'extension':
      return <ExtensionInput labelledby={labelledby} criteria={criteria} />;

    case 'absolutePath':
    case 'name':
      return <PathInput labelledby={labelledby} criteria={criteria} />;

    case 'size':
      return <SizeInput labelledby={labelledby} criteria={criteria} />;

    case 'dateAdded':
      return <DateAddedInput labelledby={labelledby} criteria={criteria} />;

    default:
      const _exhaustiveCheck: never = criteria;
      return _exhaustiveCheck;
  }
});

const PathInput = observer(({ labelledby, criteria }: Input<PathSearchCriteria>) => {
  const handleChange = useAction((e: React.ChangeEvent<HTMLInputElement>) => {
    criteria.value = e.target.value;
  });

  return (
    <input
      aria-labelledby={labelledby}
      className="input criteria-input"
      type="text"
      value={criteria.value}
      onChange={handleChange}
    />
  );
});

const TagInput = observer(({ criteria }: Input<TagSearchCriteria>) => {
  const { tagStore } = useStore();

  const selection = useComputed(() => {
    const tagID = criteria.value.at(0);
    if (tagID !== undefined) {
      const tag = tagStore.get(tagID);
      if (tag !== undefined) {
        return [tag];
      }
    }
    return [];
  });

  const handleSelect = useAction((tag: ClientTag) => {
    criteria.value = [tag.id];
  });

  const handleDeselect = useAction(() => {
    criteria.value = [];
  });

  // TODO: tooltips don't work; they're behind the dialog, arghghgh
  return (
    <TagSelector
      selection={selection.get()}
      onSelect={handleSelect}
      onDeselect={handleDeselect}
      onClear={handleDeselect}
    />
  );
});

const ExtensionInput = observer(({ labelledby, criteria }: Input<ExtensionSearchCriteria>) => {
  const handleChange = useAction((e: React.ChangeEvent<HTMLSelectElement>) => {
    criteria.value = e.target.value as IMG_EXTENSIONS_TYPE;
  });

  return (
    <select
      className="criteria-input"
      aria-labelledby={labelledby}
      onChange={handleChange}
      value={criteria.value}
    >
      {IMG_EXTENSIONS.map((ext) => (
        <option key={ext} value={ext}>
          {ext.toUpperCase()}
        </option>
      ))}
    </select>
  );
});

type SizeSearchCriteria = NumberSearchCriteria<SearchableFileData>;

const BYTES_IN_MB = 1024 * 1024;

const SizeInput = observer(({ labelledby, criteria }: Input<SizeSearchCriteria>) => {
  const handleChange = useAction((e: React.ChangeEvent<HTMLInputElement>) => {
    criteria.value = e.target.valueAsNumber * BYTES_IN_MB;
  });

  return (
    <input
      aria-labelledby={labelledby}
      className="input criteria-input"
      type="number"
      value={criteria.value / BYTES_IN_MB}
      min={0}
      onChange={handleChange}
    />
  );
});

type DateAddedSearchCriteria = DateSearchCriteria<SearchableFileData>;

const DateAddedInput = observer(({ labelledby, criteria }: Input<DateAddedSearchCriteria>) => {
  const handleChange = useAction((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.valueAsDate !== null) {
      criteria.value = e.target.valueAsDate;
    }
  });

  return (
    <input
      aria-labelledby={labelledby}
      className="input criteria-input"
      type="date"
      max={new Date().toISOString().slice(0, 10)}
      value={criteria.value.toISOString().slice(0, 10)}
      onChange={handleChange}
    />
  );
});

function changeCriteriaKey(key: FileSearchCriteriaDTO['key'], criteria: FileSearchCriteriaDTO) {
  switch (key) {
    case 'tags':
      return ClientFileSearchCriteria.tags('contains', []);

    case 'extension':
      return ClientFileSearchCriteria.extension('equals', IMG_EXTENSIONS[0]);

    // Keep the text value and operator when switching between name and path
    case 'absolutePath':
    case 'name':
      if (criteria.key === 'name' || criteria.key === 'absolutePath') {
        return ClientFileSearchCriteria.string(key, criteria.operator, criteria.value);
      } else {
        return ClientFileSearchCriteria.string(key, 'contains', '');
      }

    case 'size':
      return ClientFileSearchCriteria.number('size', 'greaterThanOrEquals', 0);

    case 'dateAdded':
      return ClientFileSearchCriteria.date('dateAdded', 'equals', new Date());

    default:
      const _exhaustiveCheck: never = key;
      return _exhaustiveCheck;
  }
}

function getOperatorOptions(
  key: FileSearchCriteriaDTO['key'],
): [readonly string[], (value: string) => string] {
  switch (key) {
    case 'tags':
      return [TreeOperators, camelCaseToSpaced];

    case 'extension':
      return [BinaryOperators, camelCaseToSpaced];

    // Keep the text value and operator when switching between name and path
    case 'absolutePath':
    case 'name':
      return [PathOperators, getStringOperatorLabel as (value: string) => string];

    case 'size':
    case 'dateAdded':
      return [NumberOperators, getNumberOperatorSymbol as (value: string) => string];

    default:
      const _exhaustiveCheck: never = key;
      return _exhaustiveCheck;
  }
}

// For performance reasons, we added some extra non-ignoreCase options,
// but these aren't really needed by the user, so hide them to avoid clutter:
const PathOperators: StringOperatorType[] = [
  'equalsIgnoreCase',
  'notEqual',
  'contains',
  'notContains',
  'startsWithIgnoreCase',
  'notStartsWith',
];
