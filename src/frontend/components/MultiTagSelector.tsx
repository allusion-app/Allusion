import React, { ReactElement, useContext, useRef, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { action } from 'mobx';

import { ClientTag, ROOT_TAG_ID } from 'src/entities/Tag';
import { generateId } from 'src/entities/ID';

import StoreContext from '../contexts/StoreContext';

import { IconButton, IconSet, Listbox, Option, Tag } from 'widgets';
import { MenuDivider } from 'widgets/menus';
import { Flyout } from 'widgets/popovers';

interface IMultiTagSelector {
  selection: ClientTag[];
  onSelect: (item: ClientTag) => void;
  onDeselect: (item: ClientTag) => void;
  onTagClick?: (item: ClientTag) => void;
  onClear: () => void;
  onCreate?: (name: string) => Promise<ClientTag>;
  tagLabel?: (item: ClientTag) => string;
  disabled?: boolean;
  extraOption?: { label: string; action: () => void; icon?: JSX.Element };
  extraIconButtons?: ReactElement;
}

const MultiTagSelector = observer((props: IMultiTagSelector) => {
  const {
    selection,
    onSelect,
    onDeselect,
    onTagClick,
    onClear,
    onCreate,
    tagLabel = action((t: ClientTag) => t.name),
    disabled,
    extraOption,
    extraIconButtons,
  } = props;
  const listboxID = useRef(generateId());
  const { tagStore } = useContext(StoreContext);
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const normalizedQuery = query.toLowerCase();
  const suggestions = tagStore.tagList.filter(
    (t) => t.id !== ROOT_TAG_ID && t.name.toLowerCase().indexOf(normalizedQuery) >= 0,
  );

  return (
    <div
      role="combobox"
      aria-expanded={isOpen}
      className="input"
      onBlur={(e) => {
        if (e.relatedTarget instanceof HTMLElement && e.relatedTarget.matches('[role="option"]')) {
          return;
        }
        setIsOpen(false);
      }}
    >
      <Flyout
        isOpen={isOpen}
        cancel={() => setIsOpen(false)}
        placement="bottom-start"
        target={
          <div className="multiautocomplete-input">
            <div className="input-wrapper">
              {selection.map((t) => (
                <Tag
                  key={t.id}
                  text={tagLabel(t)}
                  color={t.viewColor}
                  onRemove={() => onDeselect(t)}
                  onClick={onTagClick ? () => onTagClick(t) : undefined}
                />
              ))}
              <input
                disabled={disabled}
                type="text"
                value={query}
                aria-autocomplete="list"
                onChange={(e) => {
                  setIsOpen(true);
                  setQuery(e.target.value);
                }}
                aria-controls={listboxID.current}
              />
            </div>
            {extraIconButtons}
            <IconButton icon={IconSet.CLOSE} text="Close" onClick={onClear} />
          </div>
        }
      >
        <Listbox id={listboxID.current} multiselectable>
          {suggestions.map((t) => {
            const isSelected = selection.includes(t);
            return (
              <Option
                key={t.id}
                selected={isSelected}
                value={t.name}
                onClick={() => {
                  if (!isSelected) {
                    onSelect(t);
                  } else {
                    onDeselect(t);
                  }
                  setIsOpen(false);
                  setQuery('');
                }}
              />
            );
          })}
          {onCreate && suggestions.length === 0 ? (
            <Option
              key="create"
              selected={false}
              value={`Create Tag "${query}"`}
              icon={IconSet.TAG_ADD}
              onClick={async () => {
                onSelect(await onCreate(query));
                setQuery('');
                setIsOpen(false);
              }}
            />
          ) : null}
          {extraOption && (
            <>
              <MenuDivider />
              <Option
                value={extraOption.label}
                onClick={extraOption.action}
                icon={extraOption.icon}
              />
            </>
          )}
        </Listbox>
      </Flyout>
    </div>
  );
});

export { MultiTagSelector };
