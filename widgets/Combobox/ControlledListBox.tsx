import React from 'react';
import { IListbox } from './Listbox';

interface IControlledListBox extends IListbox {
  listRef?: React.RefObject<HTMLUListElement>;
}

export const ControlledListbox = (props: IControlledListBox) => {
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
