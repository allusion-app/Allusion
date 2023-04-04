import { useRef } from 'react';

export function useLazy<T>(init: () => NonNullable<T>): NonNullable<T> {
  const ref = useRef<NonNullable<T>>();

  if (ref.current === undefined) {
    ref.current = init();
  }

  return ref.current;
}