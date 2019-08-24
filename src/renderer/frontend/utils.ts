import path from 'path';

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

export const getThumbnailPath = (filePath: string, thumbnailDirectory: string, thumbnailType: string): string => {
  const baseFilename = path.basename(filePath, path.extname(filePath));

  // Hash is needed to avoid files with the same name to clash with each other, when they come from different paths
  const hash = hashString(filePath);

  return path.join(thumbnailDirectory, `${baseFilename}-${hash}.${thumbnailType}`);
};

export const hashString = (s: string) => {
  let hash = 0;
  let chr = 0;
  if (s.length === 0) {
    return hash;
  }
  for (let i = 0; i < s.length; i++) {
    chr = s.charCodeAt(i);
    // tslint:disable-next-line: no-bitwise
    hash = ((hash << 5) - hash) + chr;
    // tslint:disable-next-line: no-bitwise
    hash |= 0; // Convert to 32bit integer
  }
  return hash;
};
