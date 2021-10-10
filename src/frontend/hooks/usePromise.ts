import { useEffect, useRef, useState } from 'react';

export type Result<T, E> = { tag: 'ok'; value: T } | { tag: 'err'; err: E };
export type Poll<T> = { tag: 'ready'; value: T } | { tag: 'pending' };

export function usePromise<
  T,
  E extends any,
  S extends [...any[]],
  F extends (...args: [...S]) => Promise<T>
>(...args: [...S, F]): Poll<Result<T, E>> {
  const sources = args.slice(0, args.length - 1) as [...S];
  const fetch = useRef<F>(args[args.length - 1] as F);
  const [future, setFuture] = useState<Poll<Result<T, E>>>({ tag: 'pending' });

  useEffect(() => {
    let isEffectRunning = true;
    const promise = fetch.current.apply(null, sources);
    setFuture({ tag: 'pending' });
    promise
      .then((value: T) => {
        if (isEffectRunning) {
          setFuture({ tag: 'ready', value: { tag: 'ok', value } });
        }
      })
      .catch((err) => {
        if (isEffectRunning) {
          setFuture({ tag: 'ready', value: { tag: 'err', err } });
        }
      });

    return () => {
      isEffectRunning = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, sources);

  return future;
}
