import React, { useEffect, useRef, useState } from 'react';
import { usePopper } from 'react-popper';
import { generateWidgetId } from 'widgets/utility';

interface OptionGroup {
  label: string;
  options: readonly any[];
}
type Options = readonly any[] | readonly OptionGroup[];

interface GridComboboxProps {
  value: any;
  onChange: (value: any) => void;
  data: Options;
  colcount: number;
  isSelected: (option: any, selection: any) => boolean;
  labelFromOption: (value: any) => string;
  renderOption: (value: any, index: number, selection: boolean) => React.ReactNode;
  autoFocus?: boolean;
  textboxId?: string;
  textboxLabelledby?: string;
  popupLabelledby?: string;
}

export const GridCombobox = ({
  value,
  onChange,
  data,
  isSelected,
  labelFromOption,
  renderOption,
  colcount,
  autoFocus,
  textboxId,
  textboxLabelledby,
  popupLabelledby,
}: GridComboboxProps) => {
  const popupId = useRef(generateWidgetId('__combobox-popup')).current;
  const input = useRef<HTMLInputElement>(null);
  const activeDescendant = useRef<HTMLElement | null>(null);
  const popup = useRef<HTMLDivElement>(null);
  const rowCount = useRef(data.length);
  const rowIndex = useRef(-1);
  const colIndex = useRef(0);

  const [expanded, setExpanded] = useState(false);
  const [query, setQuery] = useState(() => {
    if (data.length === 0) {
      return '';
    }

    // Option groups
    if ('label' in data[0] && 'options' in data[0]) {
      for (const optgroup of data as OptionGroup[]) {
        const optionIndex = optgroup.options.findIndex((option: any) => isSelected(option, value));
        if (optionIndex > -1) {
          return labelFromOption(optgroup.options[optionIndex]);
        }
      }
    }
    // Options
    else {
      const optionIndex = data.findIndex((option: any) => isSelected(option, value));
      if (optionIndex > -1) {
        return labelFromOption(data[optionIndex]);
      }
    }
    return '';
  });
  const [matches, setMatches] = useState(data);

  const { styles, attributes, update } = usePopper(input.current, popup.current, {
    placement: 'bottom-start',
    modifiers: [
      {
        name: 'preventOverflow',
        options: {
          // Prevents dialogs from moving elements to the side
          boundary: document.body,
          altAxis: true,
          padding: 8,
        },
      },
      { name: 'flips', options: { fallbackPlacements: ['top-start'] } },
    ],
  });

  // Moves visual focus back to textbox
  const clearVisualFocus = useRef(() => {
    if (activeDescendant.current !== null) {
      (activeDescendant.current.parentElement as HTMLElement).dataset.focused = 'false';
      activeDescendant.current.dataset.cellFocused = 'false';
    }
    input.current?.setAttribute('aria-activedescendant', '');
    rowIndex.current = -1;
  });

  useEffect(() => {
    if (expanded) {
      update?.();
    } else {
      // Remove visual focus from active row and cell
      clearVisualFocus.current();
    }
  }, [expanded, update]);

  useEffect(() => {
    if (query.length === 0 || data.length === 0) {
      setMatches(data);
      rowCount.current = getRowCount(data);
      return;
    }
    const queryNormalized = query.toLowerCase();

    let options;

    // Option groups
    if ('label' in data[0] && 'options' in data[0]) {
      options = data.map((optgroup: OptionGroup) => {
        return {
          ...optgroup,
          options: optgroup.options.filter((option) =>
            labelFromOption(option).toLowerCase().includes(queryNormalized),
          ),
        };
      });
    }
    // Options
    else {
      options = data.filter((option: any) =>
        labelFromOption(option).toLowerCase().includes(queryNormalized),
      );
    }
    setMatches(options);
    rowCount.current = getRowCount(options);
  }, [data, labelFromOption, query]);

  const close = useRef(() => setExpanded(false)).current;

  const handleFocus = useRef(() => setExpanded(true)).current;

  const handleKeydown = useRef((e: React.KeyboardEvent<HTMLInputElement>) => {
    e.stopPropagation();

    switch (e.key) {
      // Move row down
      case 'ArrowDown':
        setExpanded(true);
        rowIndex.current = (rowIndex.current + 1) % rowCount.current;
        break;

      // Move row up
      case 'ArrowUp':
        if (rowIndex.current === -1) {
          return;
        }
        rowIndex.current = (rowIndex.current - 1 + rowCount.current) % rowCount.current;
        break;

      // Move to next gridcell
      case 'ArrowRight':
        if (rowIndex.current === -1) {
          return;
        }
        colIndex.current = (colIndex.current + 1) % colcount;
        break;

      // Move to previous gridcell
      case 'ArrowLeft':
        if (rowIndex.current === -1) {
          return;
        }
        colIndex.current = (colIndex.current - 1 + colcount) % colcount;
        break;

      case 'Escape':
        e.preventDefault();
        close();
        break;

      case 'Enter':
        const gridcell = activeDescendant.current;
        if (gridcell !== null) {
          gridcell.dispatchEvent(new Event('mousedown', { bubbles: true }));
          close();
        }
        break;

      default:
        return;
    }

    // Popper element exists for the lifetime of this component
    const popper = e.currentTarget.nextElementSibling as HTMLElement;
    const cell = (popper.querySelector(
      `[aria-rowindex="${rowIndex.current + 1}"] > [aria-colindex="${colIndex.current + 1}"]`,
    ) ??
      popper.querySelector(
        `[aria-rowindex="${rowIndex.current + 1}"] > [role="gridcell"]:last-child`,
      )) as HTMLElement | null;
    if (cell === null) {
      return;
    }

    // Remove visual focus from active row and cell
    if (activeDescendant.current !== null) {
      (activeDescendant.current.parentElement as HTMLElement).dataset.focused = 'false';
      activeDescendant.current.dataset.cellFocused = 'false';
    }

    // Visually focus next row and cell
    (cell.parentElement as HTMLElement).dataset.focused = 'true';
    cell.dataset.cellFocused = 'true';
    cell.scrollIntoView({ block: 'center' });

    e.currentTarget.setAttribute('aria-activedescendant', cell.id);
    activeDescendant.current = cell;
  }).current;

  const handleTextChange = useRef((e: React.ChangeEvent<HTMLInputElement>) => {
    setExpanded(true);
    const query = e.currentTarget.value;
    setQuery(query);

    // Remove visual focus from active row and cell
    clearVisualFocus.current();
  }).current;

  // Select option
  const handleMousedown = (e: React.MouseEvent<HTMLElement>) => {
    if (!(e.target instanceof Element) || matches.length === 0) {
      return;
    }
    const row = e.target.closest('[role="row"][aria-rowindex]') as HTMLElement | null;
    if (row !== null) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const optionIndex = parseInt(row.getAttribute('aria-rowindex')!) - 1;

      let options;
      // Option Groups
      if ('label' in matches[0] && 'options' in matches[0]) {
        options = matches.flatMap((optgroup: OptionGroup) => optgroup.options);
      }
      // Options
      else {
        options = matches;
      }
      const option = options[optionIndex];
      // Set value
      setQuery(labelFromOption(option));
      onChange(option);
    }
  };

  const children = () => {
    if (matches.length === 0) {
      return [];
    }

    // Option Groups
    if ('label' in matches[0] && 'options' in matches[0]) {
      let index = 0;
      return matches.map((optgroup: OptionGroup) => (
        <Optgroup key={optgroup.label} label={optgroup.label}>
          {optgroup.options.map((option: any) => {
            index += 1;
            return renderOption(option, index, isSelected(option, value));
          })}
        </Optgroup>
      ));
    }
    // Options
    else {
      return matches.map((option: any, index: number) =>
        renderOption(option, index + 1, isSelected(option, value)),
      );
    }
  };

  return (
    <div
      role="combobox"
      aria-haspopup="grid"
      aria-owns={popupId}
      aria-expanded={expanded}
      className="input"
    >
      <input
        autoFocus={autoFocus}
        ref={input}
        id={textboxId}
        type="text"
        spellCheck={false}
        aria-labelledby={textboxLabelledby}
        aria-autocomplete="list"
        aria-controls={popupId}
        aria-activedescendant="" // set manually in event listeners
        value={query}
        onChange={handleTextChange}
        onFocus={handleFocus}
        onKeyDown={handleKeydown}
        onBlur={close}
      />
      <div
        ref={popup}
        data-popover
        data-open={expanded}
        style={styles.popper}
        {...attributes.popper}
        id={popupId}
        role="grid"
        aria-labelledby={popupLabelledby}
        aria-rowcount={rowCount.current}
        aria-colcount={colcount}
        onMouseDown={handleMousedown}
      >
        {expanded ? children() : []}
      </div>
    </div>
  );
};

interface OptgroupProps {
  label: string;
  children: React.ReactNode;
}

const Optgroup = ({ label, children }: OptgroupProps) => {
  const labelId = useRef(generateWidgetId('__optgroup')).current;
  return (
    <div aria-labelledby={labelId} role="group">
      <div id={labelId}>{label}</div>
      {children}
    </div>
  );
};

interface RowProps {
  rowIndex: number;
  selected?: boolean;
  children: React.ReactElement<CellProps> | React.ReactElement<CellProps>[];
}

export const GridOption = ({ rowIndex, selected, children, ...props }: RowProps) => {
  return (
    <div
      {...props}
      role="row"
      aria-rowindex={rowIndex}
      aria-selected={selected}
      data-focused={false}
    >
      {children}
    </div>
  );
};

interface CellProps {
  id: string;
  colIndex: number;
  colspan?: number;
  children?: React.ReactNode;
  className?: string;
}

export const GridOptionCell = ({ id, colIndex, children, colspan, className }: CellProps) => {
  return (
    <div
      id={id}
      role="gridcell"
      aria-colindex={colIndex}
      aria-colspan={colspan}
      data-cell-focused={false}
      className={className}
    >
      {children}
    </div>
  );
};

function getRowCount(data: Options) {
  if (data.length === 0) {
    return 0;
  }

  // Option groups
  if ('label' in data[0] && 'options' in data[0]) {
    return (data as OptionGroup[]).reduce((acc, optgroup) => acc + optgroup.options.length, 0);
  }
  // Options
  else {
    return data.length;
  }
}
