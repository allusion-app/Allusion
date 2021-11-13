import React, { ForwardedRef, forwardRef, ReactElement, ReactNode, useRef, useState } from 'react';

export interface GridProps {
  id?: string;
  /** When multiselectable is set to true, the click event handlers on the option elements must togggle the select state. */
  multiselectable?: boolean;
  children: GridChildren;
}

export type GridChild = React.ReactElement<RowProps>;
export type GridChildren = GridChild | GridChild[] | React.ReactFragment;

export const Grid = forwardRef(function Grid(props: GridProps, ref: ForwardedRef<HTMLDivElement>) {
  const { id, multiselectable, children } = props;

  return (
    <div ref={ref} id={id} role="grid" aria-multiselectable={multiselectable}>
      {children}
    </div>
  );
});

export function useGridFocus(
  gridRef: React.RefObject<HTMLDivElement>,
): [focus: string | undefined, handleInput: (event: React.KeyboardEvent) => void] {
  const focus = useRef(0);
  const [activeIndex, setActiveIndex] = useState<string>();

  const handleFocus = useRef((event: React.KeyboardEvent) => {
    if (gridRef.current === null || gridRef.current.childElementCount === 0) {
      return;
    }

    const scrollOpts: ScrollIntoViewOptions = { block: 'nearest' };
    const options = gridRef.current.querySelectorAll(
      'div[role="row"]',
    ) as NodeListOf<HTMLDivElement>;
    const numOptions = options.length;
    focus.current = Math.min(numOptions - 1, focus.current);
    const activeElement = options[focus.current];
    switch (event.key) {
      case 'Enter':
        event.stopPropagation();
        activeElement.click();
        break;

      case 'ArrowUp': {
        event.stopPropagation();
        event.preventDefault();
        focus.current = (focus.current - 1 + numOptions) % numOptions;
        if (focus.current === numOptions - 1) {
          gridRef.current.scrollTop = gridRef.current.scrollHeight;
        } else {
          const prevElement = options[focus.current];
          prevElement.scrollIntoView(scrollOpts);
        }
        let previous = undefined;
        for (let i = 0; i < options.length; i++) {
          const element = options[i];
          if (element.dataset['focused'] === 'true') {
            element.dataset['focused'] = 'false';
            previous = i;
            break;
          }
        }
        if (previous === undefined) {
          focus.current = options.length - 1;
        }
        options[focus.current].dataset['focused'] = 'true';
        setActiveIndex(options[focus.current].id);
        break;
      }

      case 'ArrowDown': {
        event.stopPropagation();
        event.preventDefault();
        focus.current = (focus.current + 1) % numOptions;
        if (focus.current === 0) {
          gridRef.current.scrollTop = 0;
        } else {
          const nextElement = options[focus.current];
          nextElement.scrollIntoView(scrollOpts);
        }
        let previous = undefined;
        for (let i = 0; i < options.length; i++) {
          const element = options[i];
          if (element.dataset['focused'] === 'true') {
            element.dataset['focused'] = 'false';
            previous = i;
            break;
          }
        }
        if (previous === undefined) {
          focus.current = 0;
        }
        options[focus.current].dataset['focused'] = 'true';
        setActiveIndex(options[focus.current].id);
        break;
      }

      // Note: no 'space' to select, since space is valid input for the input-field

      default:
        break;
    }
  });

  return [activeIndex, handleFocus.current];
}

export interface RowProps {
  id?: string;
  value: string;
  selected?: boolean;
  /** The icon on the right side of the label because on the left is the checkmark already. */
  icon?: JSX.Element;
  onClick?: (event: React.MouseEvent<HTMLElement>) => void;
  children?: ReactElement<GridCellProps> | ReactElement<GridCellProps>[];
  tooltip?: string;
}

export const Row = ({ id, value, selected, onClick, icon, tooltip, children }: RowProps) => (
  <div
    id={id}
    role="row"
    aria-selected={selected}
    // TODO: for QuickSearch: it doesn't trigger onClick, but does on Enter?? Almost as if the container detects onClick and unmounts before the event can rich this div
    onClick={onClick}
    tabIndex={-1} // Important for focus handling!
    data-tooltip={tooltip}
  >
    <GridCell>
      <span className="combobox-popup-option-icon" aria-hidden>
        {icon}
      </span>
      {value}
    </GridCell>
    {children}
  </div>
);

export const RowSeparator = () => <div role="separator"></div>;

interface GridCellProps {
  id?: string;
  className?: string;
  children?: ReactNode;
}

export const GridCell = ({ id, className, children }: GridCellProps) => {
  return (
    <div id={id} role="gridcell" className={className}>
      {children}
    </div>
  );
};
