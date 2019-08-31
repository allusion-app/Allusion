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

export function formatTagCountText(numTags: number, numCols: number) {
  const extraTagsText = numTags
    ? `+${numTags} tag${numTags === 1 ? '' : 's'}`
    : '';
  const extraColsText = numCols
    ? `${extraTagsText && ', '}+${numCols} collection${numCols === 1 ? '' : 's'}`
    : '';
  return `${extraTagsText}${extraColsText}`;
}

export function capitalize(value: string) {
  if (!value) {
    return '';
  }
  return `${value.charAt(0).toUpperCase()}${value.slice(1)}`;
}

export function camelCaseToSpaced(value: string) {
  if (!value) {
    return '';
  }
  return value
    // insert a space before all caps
    .replace(/([A-Z])/g, ' $1')
    // uppercase the first character
    .replace(/^./, (str) => str.toUpperCase());
}

export const formatDateTime = (date: Date) =>
  `${date.toLocaleDateString()} ${date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}`;

export const jsDateFormatter = {
  formatDate: (date: Date) => date.toLocaleDateString(),
  parseDate: (str: string) => new Date(str),
  placeholder: 'Choose a date...',
};
