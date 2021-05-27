import React, { ForwardedRef, forwardRef, useRef, useState } from 'react';

export interface IListbox {
  id?: string;
  /** When multiselectable is set to true, the click event handlers on the option elements must togggle the select state. */
  multiselectable?: boolean;
  children: ListboxChildren;
}

export type ListboxChild = React.ReactElement<IOption>;
export type ListboxChildren = ListboxChild | ListboxChild[] | React.ReactFragment;

export const Listbox = forwardRef(function ListBox(
  props: IListbox,
  ref: ForwardedRef<HTMLUListElement>,
) {
  const { id, multiselectable, children } = props;

  return (
    <ul ref={ref} id={id} tabIndex={-1} role="listbox" aria-multiselectable={multiselectable}>
      {children}
    </ul>
  );
});

export function useListboxFocus(
  listRef: React.RefObject<HTMLUListElement>,
): [focus: number, handleInput: (event: React.KeyboardEvent) => void] {
  const focus = useRef(0);
  const [activeIndex, setActiveIndex] = useState(0);

  const handleFocus = useRef((event: React.KeyboardEvent) => {
    if (listRef.current === null || listRef.current.childElementCount === 0) {
      return;
    }

    const scrollOpts: ScrollIntoViewOptions = { block: 'nearest' };
    const options = listRef.current.querySelectorAll(
      'li[role="option"]',
    ) as NodeListOf<HTMLLIElement>;
    const numOptions = options.length;
    focus.current = Math.min(numOptions - 1, focus.current);
    const activeElement = options[focus.current];
    switch (event.key) {
      case 'Enter':
        event.stopPropagation();
        activeElement.click();
        break;

      case 'ArrowUp':
        event.stopPropagation();
        event.preventDefault();
        focus.current = (focus.current - 1 + numOptions) % numOptions;
        if (focus.current === numOptions - 1) {
          listRef.current.scrollTop = listRef.current.scrollHeight;
        } else {
          const prevElement = options[focus.current];
          prevElement.scrollIntoView(scrollOpts);
        }
        setActiveIndex(focus.current);
        break;

      case 'ArrowDown':
        event.stopPropagation();
        event.preventDefault();
        focus.current = (focus.current + 1) % numOptions;
        if (focus.current === 0) {
          listRef.current.scrollTop = 0;
        } else {
          const nextElement = options[focus.current];
          nextElement.scrollIntoView(scrollOpts);
        }
        setActiveIndex(focus.current);
        break;

      // Note: no 'space' to select, since space is valid input for the input-field

      default:
        break;
    }
  });

  return [activeIndex, handleFocus.current];
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

export const Option = ({ value, selected, onClick, icon, disabled, focused }: IOption) => (
  <li
    role="option"
    aria-selected={selected}
    aria-disabled={disabled}
    onClick={disabled ? undefined : onClick}
    tabIndex={focused ? 0 : -1}
  >
    <span className="item-icon" aria-hidden />
    {value}
    <span className="item-accelerator" aria-hidden>
      {icon}
    </span>
  </li>
);
