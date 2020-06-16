import React, { useContext } from 'react';
import { observer } from 'mobx-react-lite';

import StoreContext from '../../contexts/StoreContext';

import TagsPanel from './TagsPanel';
import LocationsPanel from './LocationsPanel';

/**
 * Enum variant with associated data for Action enums
 *
 * TypeScript's enum is rather a strongly typed bit flag than a sum type. In
 * other more functional languages, each enum variant can have associated data.
 * Enums use one field as incrementor / bit `flag` to differentiate variants
 * and optionally add `data`. Then using this interface, one creates a type
 * alias similar to string literals.
 *
 * ```
 * const enum Flag {
 *    Foo, // Compiles to 0
 *    Bar, // Compiles to 1
 * }
 * type MyEnum = IAction<Flag.Foo, string> | IAction<Flag.Bar, number>;
 * ```
 */
export interface IAction<F, D> {
  flag: F;
  data: D;
}

/** Map that keeps track of the IDs that are expanded */
export type IExpansionState = { [key: string]: boolean };

const Outliner = () => {
  const rootStore = useContext(StoreContext);
  const { uiStore } = rootStore;

  // Todo: Use https://blueprintjs.com/docs/#core/components/tabs
  return (
    <nav id="outliner" className={`${uiStore.isOutlinerOpen ? 'outlinerOpen' : ''}`}>
      <LocationsPanel />
      <TagsPanel />
    </nav>
  );
};

export default observer(Outliner);
