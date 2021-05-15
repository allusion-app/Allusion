import React from 'react';

export interface IListbox {
  id?: string;
  /** When multiselectable is set to true, the click event handlers on the option elements must togggle the select state. */
  multiselectable?: boolean;
  children: ListboxChildren;
}

export type ListboxChild = React.ReactElement<IOption>;
export type ListboxChildren = ListboxChild | ListboxChild[] | React.ReactFragment;

export const Listbox = (props: IListbox) => {
  const { id, multiselectable, children } = props;

  return (
    <ul
      id={id}
      tabIndex={-1}
      role="listbox"
      aria-multiselectable={multiselectable}
      onFocus={handleFocus}
      onKeyDown={handleKeyDown}
    >
      {children}
    </ul>
  );
};

export interface IOption {
  value: string;
  hint?: string;
  selected?: boolean;
  /** The icon on the right side of the label because on the left is the checkmark already. */
  icon?: JSX.Element;
  onClick?: (event: React.MouseEvent<HTMLElement>) => void;
  disabled?: boolean;
  focused?: boolean;
}

export const Option = ({
  value,
  hint,
  selected,
  onClick,
  icon,
  disabled,
  focused,
  ...rest
}: IOption & React.HTMLAttributes<HTMLLIElement>) => (
  <li
    role="option"
    aria-selected={selected}
    aria-disabled={disabled}
    onClick={disabled ? undefined : onClick}
    tabIndex={-1}
    className={focused ? 'focused' : undefined}
    {...rest}
  >
    <span className="item-icon" aria-hidden />
    {value}
    <span className="item-accelerator" aria-hidden>
      {icon}
    </span>
    {hint && <span className="item-hint">{hint}</span>}
  </li>
);

function handleFocus(event: React.FocusEvent) {
  const target = (event.target as HTMLElement).closest('[role="option"]') as HTMLElement | null;
  if (target === null) {
    return;
  }

  const previous: HTMLElement | null = event.currentTarget.querySelector(
    '[role="option"][tabindex="0"]',
  );
  if (previous !== null) {
    previous.tabIndex = -1;
  }
  target.tabIndex = 0;
  target.focus();
}

function handleKeyDown(event: React.KeyboardEvent) {
  const target = event.target as HTMLElement;
  switch (event.key) {
    case 'Enter':
      event.stopPropagation();
      target.click();
      break;

    case 'ArrowUp':
      if (target.previousElementSibling !== null) {
        event.stopPropagation();
        (target.previousElementSibling as HTMLElement).focus();
      }
      break;

    case 'ArrowDown':
      if (target.nextElementSibling !== null) {
        event.stopPropagation();
        (target.nextElementSibling as HTMLElement).focus();
      }
      break;

    case ' ':
      // Prevents scroll behaviour
      event.preventDefault();
      // If the listbox allows multi selection, the click event will toggle the selection.
      if (event.currentTarget.getAttribute('aria-multiselectable') === 'true') {
        event.stopPropagation();
        target.click();
      }
      break;

    default:
      break;
  }
}
