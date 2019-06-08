export function debounce<F extends (...args: any) => any>(func: F, wait: number = 300): F {
  let timeoutID: number;

  if (!Number.isInteger(wait)) {
    console.log(' Called debounce with an invalid number');
    wait = 300;
  }

  // conversion through any necessary as it wont satisfy criteria otherwise
  return function(this: any, ...args: any[]) {
    clearTimeout(timeoutID);
    const context = this;

    timeoutID = window.setTimeout(
      () => func.apply(context, args),
      wait);
  } as any as F;
}

export function throttle(fn: (...args: any) => any, wait: number = 300) {
  let isCalled = false;

  return (...args: any[]) => {
      if (!isCalled) {
          fn(...args);
          isCalled = true;
          setTimeout(
            () => { isCalled = false; },
            wait,
          );
      }
  };
}
