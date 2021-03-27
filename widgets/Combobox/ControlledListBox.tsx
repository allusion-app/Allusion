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
      {/* {React.Children.map(children, (child, index) =>
        React.isValidElement(child)
          ? React.cloneElement(child, { focused: index === activeIndex })
          : child,
      )} */}
    </ul>
  );
};

export function controlledListBoxKeyDown(
  event: React.KeyboardEvent,
  listRef: React.RefObject<HTMLUListElement>,
  setActiveIndex: (index: number) => void,
  activeIndex: number,
  numItems: number,
) {
  const activeElement = listRef.current?.childNodes[activeIndex] as HTMLElement | undefined;
  switch (event.key) {
    case 'Enter':
      event.stopPropagation();
      activeElement?.click();
      break;

    case 'ArrowUp':
      event.stopPropagation();
      const prevIndex = (activeIndex - 1 + numItems) % numItems;
      setActiveIndex(prevIndex);
      const prevElement = listRef.current?.childNodes[prevIndex] as HTMLElement | undefined;
      prevElement?.scrollIntoView();
      break;

    case 'ArrowDown':
      event.stopPropagation();
      const nextIndex = (activeIndex + 1) % numItems;
      setActiveIndex(nextIndex);
      const nextElement = listRef.current?.childNodes[nextIndex] as HTMLElement | undefined;
      nextElement?.scrollIntoView();
      break;

    case ' ':
      // Prevents scroll behaviour
      event.preventDefault();
      // If the listbox allows multi selection, the click event will toggle the selection.
      if (event.currentTarget.getAttribute('aria-multiselectable') === 'true') {
        event.stopPropagation();
        activeElement?.click();
      }
      break;

    default:
      break;
  }
}
