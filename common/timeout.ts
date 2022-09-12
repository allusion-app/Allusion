import { CancellablePromise } from './promise';

/**
 * Performs a single promise, but retries when it fails for a specified amount of time.
 * Timeout is doubled after every failed retry
 **/
export async function promiseRetry<T>(
  fn: () => Promise<T>,
  retries = 5,
  timeout = 1000,
  err?: any,
): Promise<T> {
  await new Promise((resolve) => setTimeout(resolve, timeout));

  return !retries
    ? Promise.reject(err)
    : fn().catch((error) => promiseRetry(fn, retries - 1, timeout * 2, error));
}

export function debounce<F extends (...args: any) => any>(func: F, wait: number = 300): F {
  let timeoutID: ReturnType<typeof setTimeout>;

  if (!Number.isInteger(wait)) {
    console.log(' Called debounce with an invalid number');
    wait = 300;
  }

  // conversion through any necessary as it wont satisfy criteria otherwise
  return function (this: any, ...args: any[]) {
    clearTimeout(timeoutID);

    timeoutID = setTimeout(() => func.apply(this, args), wait);
  } as any as F;
}

export function throttle(fn: (...args: any) => any, wait: number = 300) {
  let isCalled = false;

  return (...args: any[]) => {
    if (!isCalled) {
      fn(...args);
      isCalled = true;
      setTimeout(() => {
        isCalled = false;
      }, wait);
    }
  };
}

/**
 * Throttle debounce combo. Basically, same as throttle, but also calls fn at the end.
 * https://trungk18.com/experience/debounce-throttle-combination/
 * fixme: the fn is called one extra time at the end, but whatevs, good enough
 * @param fn The function to be called
 * @param wait How long to wait in between calls
 */
export function debouncedThrottle<F extends (...args: any) => any>(fn: F, wait = 300) {
  let last: Date | undefined;
  let deferTimer = 0;

  const db = debounce(fn);
  return function debouncedThrottleFn(this: any, ...args: any) {
    const now = new Date();
    if (last === undefined || now.getTime() < last.getTime() + wait) {
      clearTimeout(deferTimer);
      db.apply(this, args);
      deferTimer = setTimeout(() => {
        last = now;
        fn.apply(this, args);
      }, wait) as any;
    } else {
      last = now;
      fn.apply(this, args);
    }
  };
}

export async function withTimeout<T>(ms: number, promise: Promise<T>): Promise<Awaited<T>> {
  const timer = sleep(ms);
  try {
    return await Promise.race([
      promise,
      timer.then(() => {
        throw new Error('Promise timed out.');
      }),
    ]);
  } finally {
    timer.cancel();
  }
}

export function sleep(ms: number): CancellablePromise<void> {
  let cancel = () => {};
  const promise = new Promise<void>((resolve) => {
    let timeout: ReturnType<typeof setTimeout> | undefined = setTimeout(() => {
      if (timeout !== undefined) {
        resolve();
        timeout = undefined;
      }
    }, ms);
    cancel = () => {
      if (timeout !== undefined) {
        clearTimeout(timeout);
        timeout = undefined;
        resolve();
      }
    };
  });

  Object.defineProperty(promise, 'cancel', { value: cancel });

  return promise as CancellablePromise<void>;
}
