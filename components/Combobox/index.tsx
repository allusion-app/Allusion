/** NOTE: Listbox and Option re-use the styles from menu.scss! */
import React from 'react';
import { observer } from 'mobx-react-lite';

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

export { Listbox, Option };
