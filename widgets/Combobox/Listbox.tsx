import React from 'react';

export interface IListbox {
  id?: string;
  /** When multiselectable is set to true, the click event handlers on the option elements must togggle the select state. */
  multiselectable?: boolean;
  children: ListboxChildren;
  listRef?: React.RefObject<HTMLUListElement>;
}

export type ListboxChild = React.ReactElement<IOption>;
export type ListboxChildren = ListboxChild | ListboxChild[] | React.ReactFragment;

export const Listbox = (props: IListbox) => {
  const { id, multiselectable, children, listRef } = props;

  return (
    <ul id={id} tabIndex={-1} role="listbox" aria-multiselectable={multiselectable} ref={listRef}>
      {children}
    </ul>
  );
};

const scrollOpts: ScrollIntoViewOptions = { block: 'nearest' };

export function controlledListBoxKeyDown(
  event: React.KeyboardEvent,
  listRef: React.RefObject<HTMLUListElement>,
  setActiveIndex: (index: number) => void,
  activeIndex: number,
) {
  const optionElems = listRef.current?.querySelectorAll('li:not([role="separator"])') || [];
  const numItems = optionElems.length;
  const activeElement = optionElems[activeIndex] as HTMLElement | undefined;
  switch (event.key) {
    case 'Enter':
      event.stopPropagation();
      activeElement?.click();
      break;

    case 'ArrowUp':
      event.stopPropagation();
      event.preventDefault();
      const prevIndex = (activeIndex - 1 + numItems) % numItems;
      setActiveIndex(prevIndex);
      if (prevIndex === numItems - 1 && listRef.current) {
        listRef.current.scrollTop = listRef.current.scrollHeight;
      } else {
        const prevElement = optionElems[prevIndex] as HTMLElement | undefined;
        prevElement?.scrollIntoView(scrollOpts);
      }
      break;

    case 'ArrowDown':
      event.stopPropagation();
      event.preventDefault();
      const nextIndex = (activeIndex + 1) % numItems;
      setActiveIndex(nextIndex);
      if (nextIndex === 0 && listRef.current) {
        listRef.current.scrollTop = 0;
      } else {
        const nextElement = optionElems[nextIndex] as HTMLElement | undefined;
        nextElement?.scrollIntoView(scrollOpts);
      }
      break;

    // Note: no 'space' to select, since space is valid input for the input-field

    default:
      break;
  }
}

export interface IOption {
  value: string;
  selected?: boolean;
  /** The icon on the right side of the label because on the left is the checkmark already. */
  icon?: JSX.Element;
  onClick?: (event: React.MouseEvent<HTMLElement>) => void;
  disabled?: boolean;
  focused?: boolean;
}

export const Option = ({
  value,
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
  </li>
);
