import { action } from 'mobx';
import { useRef } from 'react';

/**
 * Creates an action function from a function.
 *
 * @param fun function that must only capture MobX objects or stable references.
 * @returns action function with stable identity across renders
 */
export function useAction<F extends (...args: any) => any>(fun: F): F {
  return useRef(action(fun)).current;
}
