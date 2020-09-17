/** NOTE: Listbox and Option re-use the styles from menu.scss! */
import React, { useState } from 'react';
import { observer } from 'mobx-react-lite';
import { Flyout } from '../Dialog';
import { IconSet } from '../Icons';
import { IconButton } from '../Button';
import { Tag } from '../Tag';

interface IOption {
  value: string;
  selected?: boolean;
  icon?: JSX.Element;
  rightIcon?: JSX.Element;
  onClick: (event: React.MouseEvent<HTMLElement>) => void;
  disabled?: boolean;
}

const Option = observer(({ value, selected, onClick, icon, rightIcon, disabled }: IOption) => (
  <li
    role="option"
    aria-selected={selected}
    aria-disabled={disabled}
    onClick={disabled ? undefined : onClick}
    tabIndex={-1}
  >
    <span className="item-icon" aria-hidden>
      {icon}
    </span>
    {value}
    <span className="item-accelerator" aria-hidden>
      {rightIcon}
    </span>
  </li>
));

interface IListbox {
  multiselectable?: boolean;
  children: React.ReactFragment | React.ReactElement<IOption> | React.ReactElement<IOption>[];
}

const Listbox = observer((props: IListbox) => {
  return (
    <ul role="listbox" aria-multiselectable={props.multiselectable}>
      {props.children}
    </ul>
  );
});

interface IMultiAutoComplete<T = any> {
  selection: T[];
  items: T[];
  onSelect: (item: T) => void;
  onDeselect: (item: T) => void;
  onClear: () => void;
  onCreate?: (name: string) => Promise<T>;
  tagLabel?: (item: T) => string;
  tagColor?: (item: T) => string | undefined;
  disabled?: boolean;
}

const MultiAutoComplete = observer(
  ({
    selection,
    items,
    onSelect,
    onDeselect,
    onClear,
    onCreate,
    tagLabel = (t) => t.name,
    tagColor = (t) => ('viewColor' in t ? t.viewColor : t.color),
    disabled,
  }: IMultiAutoComplete) => {
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState('');
    const normalizedQuery = query.toLowerCase();
    const suggestions = items.filter((t) => t.name.toLowerCase().indexOf(normalizedQuery) >= 0);

    return (
      <div
        role="combobox"
        onBlur={(e) => {
          if (
            e.relatedTarget instanceof HTMLElement &&
            e.relatedTarget.matches('[role="option"]')
          ) {
            return;
          }
          setIsOpen(false);
        }}
      >
        <span>
          {selection.map((t) => (
            <Tag key={t.id} text={tagLabel(t)} color={tagColor(t)} onRemove={() => onDeselect(t)} />
          ))}
        </span>
        <IconButton icon={IconSet.CLOSE} text="Close" onClick={onClear} />
        <Flyout
          open={isOpen}
          placement="bottom"
          target={
            <input
              disabled={disabled}
              type="text"
              value={query}
              aria-autocomplete="list"
              onChange={(e) => {
                setIsOpen(true);
                setQuery(e.target.value);
              }}
            />
          }
        >
          <Listbox>
            {suggestions.map((t) => (
              <Option
                key={t.id}
                selected={selection.includes(t)}
                value={t.name}
                onClick={() => {
                  onSelect(t);
                  setQuery('');
                  setIsOpen(false);
                }}
              />
            ))}
            {onCreate && suggestions.length === 0 ? (
              <Option
                key="create"
                selected={false}
                value={`Create Tag ${query}`}
                onClick={async () => {
                  onSelect(await onCreate(query));
                  setQuery('');
                  setIsOpen(false);
                }}
              />
            ) : null}
          </Listbox>
        </Flyout>
      </div>
    );
  },
);

export { Listbox, Option, IMultiAutoComplete, MultiAutoComplete };
