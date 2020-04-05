import React, { useCallback, useContext, useMemo, ChangeEvent, useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { DateInput } from '@blueprintjs/datetime';
import {
  FormGroup,
  Button,
  Dialog,
  ControlGroup,
  InputGroup,
  NumericInput,
  HTMLSelect,
} from '@blueprintjs/core';

import {
  NumberOperators,
  BinaryOperators,
  StringOperators,
  ArrayOperators,
  ClientStringSearchCriteria,
  ClientArraySearchCriteria,
  ClientNumberSearchCriteria,
  ClientDateSearchCriteria,
  ClientIDSearchCriteria,
  ClientCollectionSearchCriteria,
} from '../../../entities/SearchCriteria';
import { IFile, IMG_EXTENSIONS } from '../../../entities/File';
import { jsDateFormatter, camelCaseToSpaced } from '../../utils';
import StoreContext from '../../contexts/StoreContext';
import IconSet from '../../components/Icons';
import { ClientTag } from '../../../entities/Tag';
import TagSelector from '../../components/TagSelector';
import UiStore, { FileSearchCriteria } from '../../UiStore';
import { ClientTagCollection } from '../../../entities/TagCollection';

interface IKeyLabel {
  [key: string]: string;
}

export const KeyLabelMap: IKeyLabel = {
  tags: 'Tags',
  name: 'File name',
  path: 'File path',
  extension: 'File type',
  size: 'File size (MB)',
  dateAdded: 'Date added',
};

const CriteriaKeyOrder: Array<keyof IFile> = [
  'tags',
  'name',
  'path',
  'extension',
  'size',
  'dateAdded',
];

interface IKeySelector {
  criteria: FileSearchCriteria;
  replaceCriteria: (replacement: FileSearchCriteria) => void;
}

const KeySelector = observer(({ criteria, replaceCriteria }: IKeySelector) => {
  const handlePickKey = useCallback(
    (e: ChangeEvent<HTMLSelectElement>) => {
      const key = e.target.value as keyof IFile;
      if (key === 'name' || key === 'path') {
        replaceCriteria(new ClientStringSearchCriteria(key));
      } else if (key === 'extension') {
        replaceCriteria(new ClientStringSearchCriteria(key, IMG_EXTENSIONS[0]));
      } else if (key === 'tags') {
        replaceCriteria(new ClientArraySearchCriteria(key));
      } else if (key === 'size') {
        replaceCriteria(new ClientNumberSearchCriteria(key));
      } else if (key === 'dateAdded') {
        replaceCriteria(new ClientDateSearchCriteria(key));
      }
    },
    [replaceCriteria],
  );

  return (
    <HTMLSelect
      onChange={handlePickKey}
      options={CriteriaKeyOrder.map((key) => ({ value: key, label: KeyLabelMap[key] }))}
      value={criteria.key}
    />
  );
});

interface IOperatorSelectProps {
  onSelect: (sign: any) => void;
  value: string;
  options: readonly string[];
}

const OperatorSelect = ({ onSelect, value, options }: IOperatorSelectProps) => {
  const handleSelect = useCallback(
    (e: ChangeEvent<HTMLSelectElement>) => onSelect(e.target.value),
    [onSelect],
  );
  return (
    <HTMLSelect
      onChange={handleSelect}
      options={options.map((opt) => ({ value: opt, label: camelCaseToSpaced(opt) }))}
      value={value}
    />
  );
};

interface ITagCriteriaItem {
  criteria: ClientIDSearchCriteria<IFile> | ClientCollectionSearchCriteria;
  replaceCriteria: (replacement: FileSearchCriteria) => void;
}

const TagCriteriaItem = observer(({ criteria, replaceCriteria }: ITagCriteriaItem) => {
  const { tagStore, tagCollectionStore } = useContext(StoreContext);

  const handleSelectTag = useCallback(
    (t: ClientTag) => {
      if (criteria instanceof ClientIDSearchCriteria) {
        criteria.setValue(t.id, t.name);
      } else {
        replaceCriteria(new ClientIDSearchCriteria('tags', t.id, t.name));
      }
    },
    [criteria, replaceCriteria],
  );

  const handleSelectCol = useCallback(
    (col: ClientTagCollection) => {
      if (criteria instanceof ClientCollectionSearchCriteria) {
        criteria.setValue(col.id, col.getTagsRecursively(), col.name);
      } else {
        replaceCriteria(
          new ClientCollectionSearchCriteria(col.id, col.getTagsRecursively(), col.name),
        );
      }
    },
    [criteria, replaceCriteria],
  );

  const selectedItem = useMemo(() => {
    if (criteria instanceof ClientIDSearchCriteria) {
      return criteria.value.length === 1 ? tagStore.get(criteria.value[0]) : undefined;
    } else if (criteria instanceof ClientCollectionSearchCriteria) {
      return tagCollectionStore.get(criteria.collectionId);
    }
  }, [
    tagStore,
    tagCollectionStore,
    criteria,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    criteria instanceof ClientCollectionSearchCriteria ? criteria.collectionId : criteria.value,
  ]);

  const options = useMemo(() => {
    if (!selectedItem) {
      return ArrayOperators;
    }
    return selectedItem instanceof ClientCollectionSearchCriteria
      ? ArrayOperators
      : StringOperators;
  }, [selectedItem]);

  return (
    <>
      <OperatorSelect onSelect={criteria.setOperator} value={criteria.operator} options={options} />
      <TagSelector
        selectedItem={selectedItem}
        onTagSelect={handleSelectTag}
        autoFocus
        includeCollections
        onTagColSelect={handleSelectCol}
      />
    </>
  );
});

const StringCriteriaItem = observer(
  ({ criteria }: { criteria: ClientStringSearchCriteria<IFile> }) => {
    const handleChangeValue = useCallback((e) => criteria.setValue(e.target.value), [criteria]);

    return (
      <>
        <OperatorSelect
          onSelect={criteria.setOperator}
          value={criteria.operator}
          options={StringOperators}
        />
        <InputGroup
          placeholder="Enter some text..."
          value={criteria.value}
          onChange={handleChangeValue}
          autoFocus
        />
      </>
    );
  },
);

const ExtensionCriteriaItem = observer(
  ({ criteria }: { criteria: ClientStringSearchCriteria<IFile> }) => {
    const handlePickValue = useCallback(
      (e: ChangeEvent<HTMLSelectElement>) => criteria.setValue(e.target.value),
      [criteria],
    );

    return (
      <>
        <OperatorSelect
          onSelect={criteria.setOperator}
          value={criteria.operator}
          options={BinaryOperators}
        />
        <HTMLSelect
          onChange={handlePickValue}
          options={IMG_EXTENSIONS.map((ext) => ({ value: ext, label: ext.toUpperCase() }))}
          value={criteria.value}
        />
      </>
    );
  },
);

const bytesInMb = 1024 * 1024;
const NumberCriteriaItem = observer(
  ({ criteria }: { criteria: ClientNumberSearchCriteria<IFile> }) => {
    const handleChangeValue = useCallback((val: number) => criteria.setValue(val * bytesInMb), [
      criteria,
    ]);

    return (
      <>
        <OperatorSelect
          onSelect={criteria.setOperator}
          value={criteria.operator}
          options={NumberOperators}
        />
        <NumericInput
          placeholder="Enter a number..."
          value={criteria.value / bytesInMb}
          onValueChange={handleChangeValue}
          autoFocus
          buttonPosition="none"
        />
      </>
    );
  },
);

const DateCriteriaItem = observer(({ criteria }: { criteria: ClientDateSearchCriteria<IFile> }) => {
  const handleChangeValue = useCallback((date: Date) => criteria.setValue(date), [criteria]);

  return (
    <>
      <OperatorSelect
        onSelect={criteria.setOperator}
        value={criteria.operator}
        options={NumberOperators}
      />
      <DateInput
        value={criteria.value}
        onChange={handleChangeValue}
        popoverProps={{ inheritDarkTheme: false, minimal: true, position: 'bottom' }}
        canClearSelection={false}
        maxDate={new Date()}
        {...jsDateFormatter}
      />
    </>
  );
});

interface ICriteriaItemProps {
  criteria: FileSearchCriteria;
  replaceCriteria: (replacement: FileSearchCriteria) => void;
  onRemove: () => any;
  removable: boolean;
}

// The main Criteria component, finds whatever input fields for the key should be rendered
const CriteriaItem = observer(
  ({ criteria, onRemove, removable, replaceCriteria }: ICriteriaItemProps) => {
    const critFields = useMemo(() => {
      if (criteria.key === 'name' || criteria.key === 'path') {
        return <StringCriteriaItem criteria={criteria as ClientStringSearchCriteria<IFile>} />;
      } else if (criteria.key === 'tags') {
        return (
          <TagCriteriaItem
            criteria={criteria as ClientIDSearchCriteria<IFile>}
            replaceCriteria={replaceCriteria}
          />
        );
      } else if (criteria.key === 'extension') {
        return <ExtensionCriteriaItem criteria={criteria as ClientStringSearchCriteria<IFile>} />;
      } else if (criteria.key === 'size') {
        return <NumberCriteriaItem criteria={criteria as ClientNumberSearchCriteria<IFile>} />;
      } else if (criteria.key === 'dateAdded') {
        return <DateCriteriaItem criteria={criteria as ClientDateSearchCriteria<IFile>} />;
      }
      return <p>This should never happen.</p>;
    }, [criteria, replaceCriteria]);

    return (
      <ControlGroup fill className="criteria">
        <KeySelector criteria={criteria} replaceCriteria={replaceCriteria} />
        {critFields}
        <Button text="-" onClick={onRemove} disabled={!removable} className="remove" />
      </ControlGroup>
    );
  },
);

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
  const [criterias, setCriterias] = useState(
    searchCriteriaList.length > 0
      ? searchCriteriaList.toJS()
      : [new ClientArraySearchCriteria('tags')],
  );

  useEffect(() => {
    openQuickSearch();
  }, [openQuickSearch]);

  const addSearchCriteria = () =>
    setCriterias(criterias.concat(new ClientArraySearchCriteria('tags')));

  const removeSearchCriteria = (index: number) => {
    criterias.splice(index, 1);
    setCriterias(criterias.slice());
  };

  const replaceCriteria = (current: number, replacement: FileSearchCriteria) => {
    criterias[current] = replacement;
    setCriterias(criterias.slice());
  };

  const submitSearchCriterias = useCallback(() => {
    replaceSearchCriterias(criterias);
    closeAdvancedSearch();
  }, [criterias, replaceSearchCriterias, closeAdvancedSearch]);

  const resetSearchCriteria = useCallback(() => {
    clearSearchCriteriaList();
    setCriterias([new ClientArraySearchCriteria('tags')]);
  }, [clearSearchCriteriaList]);

  return (
    <div id="search-form">
      <FormGroup>
        {criterias.map((crit, i) => (
          <CriteriaItem
            key={`crit-${i}-${crit.key}`}
            criteria={crit}
            replaceCriteria={replaceCriteria.bind(null, i)}
            onRemove={removeSearchCriteria.bind(null, i)}
            removable={criterias.length !== 1}
          />
        ))}
      </FormGroup>

      <Button icon={IconSet.ADD} onClick={addSearchCriteria} minimal text="Add" />

      <div>
        <div id="actions-bar" className="bp3-alert-footer">
          <Button
            intent="primary"
            onClick={submitSearchCriterias}
            disabled={criterias.length === 0}
            text="Search"
            icon={IconSet.SEARCH}
            fill
          />
          <Button
            onClick={resetSearchCriteria}
            disabled={criterias.length === 0}
            text="Reset"
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
