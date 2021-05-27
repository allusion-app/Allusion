import path from 'path';
import fse from 'fs-extra';

import { thumbnailType, thumbnailMaxSize } from 'src/config';

////////////////////////
//// Time-out utils ////
////////////////////////
export function debounce<F extends (...args: any) => any>(func: F, wait: number = 300): F {
  let timeoutID: number;

  if (!Number.isInteger(wait)) {
    console.log(' Called debounce with an invalid number');
    wait = 300;
  }

  // conversion through any necessary as it wont satisfy criteria otherwise
  return (function (this: any, ...args: any[]) {
    clearTimeout(timeoutID);

    timeoutID = window.setTimeout(() => func.apply(this, args), wait);
  } as any) as F;
}

export const throttle = (fn: (...args: any) => any, wait: number = 300) => {
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
};

/**
 * Throttle debounce combo. Basically, same as throttle, but also calls fn at the end.
 * https://trungk18.com/experience/debounce-throttle-combination/
 * fixme: the fn is called one extra time at the end, but whatevs, good enough
 * @param fn The function to be called
 * @param wait How long to wait in between calls
 */
export function debouncedThrottle<F extends (...args: any) => any>(fn: F, wait = 300) {
  let last: Date;
  let deferTimer = 0;

  const db = debounce(fn);
  return function debouncedThrottleFn(this: any, ...args: any) {
    const now = new Date();
    if (!last || now.getTime() < last.getTime() + wait) {
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

export const timeoutPromise = <T>(timeMS: number, promise: Promise<T>): Promise<T> => {
  return new Promise((resolve, reject) => {
    promise.then(resolve, reject);
    setTimeout(reject, timeMS);
  });
};

export const timeout = <T>(timeMS: number): Promise<T> =>
  new Promise((resolve) => setTimeout(resolve, timeMS));

///////////////////////////////
//////// Promise utils ////////
///////////////////////////////

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

/**
 * Like Promise.all, but runs batches of N promises in sequence
 * @param batchSize The amount of promises in a batch
 * @param proms The promises to run
 */
export const promiseAllBatch = async <T>(batchSize = 50, proms: Promise<T>[]) => {
  const res: T[] = [];
  for (let i = 0; i < proms.length; i += batchSize) {
    res.push(...(await Promise.all(proms.slice(i, i + batchSize))));
  }
  return res;
};

/**
 * Like Promise.all, but only runs N promises in parallel
 * https://gist.github.com/jcouyang/632709f30e12a7879a73e9e132c0d56b
 * @param n The amount of promises to run in parallel
 * @param list The promises to run
 * @param progressCallback Returns the progress as a value between 0 and 1
 * @param cancel A callback function that, when returning true, can cancel any new promises from being awaited
 */
export function promiseAllLimit<T>(
  collection: Array<() => Promise<T>>,
  n: number,
  progressCallback?: (progress: number) => void,
  cancel?: () => boolean,
): Promise<T[]> {
  // Prevents returning a Promise that is never resolved!
  if (collection.length === 0) {
    return new Promise((resolve) => resolve([]));
  }

  let i = 0;
  let jobsLeft = collection.length;
  const outcome: T[] = [];
  let rejected = false;
  // create a new promise and capture reference to resolve and reject to avoid nesting of code
  let resolve: (o: T[]) => void;
  let reject: (e: Error) => void;
  const pendingPromise: Promise<T[]> = new Promise(function (res, rej) {
    resolve = res;
    reject = rej;
  });

  // execute the j'th thunk
  function runJob(j: number) {
    collection[j]()
      .then((result) => {
        if (rejected) {
          return; // no op!
        }
        jobsLeft--;
        outcome[j] = result;

        progressCallback?.(1 - jobsLeft / collection.length);
        if (cancel?.()) {
          rejected = true;
          console.log('CANCELLING!');
          return;
        }

        if (jobsLeft <= 0) {
          resolve(outcome);
        } else if (i < collection.length) {
          runJob(i);
          i++;
        } else {
          return; // nothing to do here.
        }
      })
      .catch((e) => {
        if (rejected) {
          return; // no op!
        }
        rejected = true;
        reject(e);
        return;
      });
  }

  // bootstrap, while handling cases where the length of the given array is smaller than maxConcurrent jobs
  while (i < Math.min(collection.length, n)) {
    runJob(i);
    i++;
  }

  return pendingPromise;
}

///////////////////////////////
//// Text formatting utils ////
///////////////////////////////
export const formatTagCountText = (numTags: number) => {
  const extraTagsText = numTags > 1 ? `+${numTags} tag${numTags === 1 ? '' : 's'}` : '';
  return `${extraTagsText}`;
};

export const capitalize = (value: string) => {
  if (value.length === 0) {
    return '';
  }
  return `${value.charAt(0).toLocaleUpperCase()}${value.slice(1)}`;
};

export const camelCaseToSpaced = (value: string) => {
  if (!value) {
    return '';
  }
  return (
    value
      // insert a space before all caps
      .replace(/([A-Z])/g, ' $1')
      // uppercase the first character
      .replace(/^./, (str) => str.toUpperCase())
  );
};

export const ellipsize = (
  value: string,
  maxLength = 80,
  type: 'start' | 'middle' | 'end' = 'start',
) => {
  if (value.length <= maxLength) {
    return value;
  }
  switch (type) {
    case 'end':
      return value.substr(maxLength) + '…';
    case 'middle':
      return value.substr(0, maxLength / 2) + '…' + value.substr(value.length - maxLength / 2);
    case 'start':
    default:
      return '…' + value.substr(value.length - maxLength);
  }
};

/////////////////////////
//// Date/time utils ////
/////////////////////////
const DateTimeFormat = new Intl.DateTimeFormat(undefined, {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
});

export const formatDateTime = (d: Date) => {
  return DateTimeFormat.formatToParts(d)
    .map(({ type, value }) => (type === 'literal' && value === ', ' ? ' ' : value))
    .reduce((str, part) => str + part);
};

export const jsDateFormatter = {
  formatDate: (date: Date) => date.toLocaleDateString(),
  parseDate: (str: string) => new Date(str),
  placeholder: 'Choose a date...',
};

/** Returns date in YYYYMMDDTHHMMSS format (ISO-string without symbols and milliseconds) */
export function getFilenameFriendlyFormattedDateTime(date: Date) {
  return date.toISOString().replaceAll(/-|:/g, '').slice(0, -5);
}

//////////////////////
//// Color utils /////
//////////////////////
export const hexToHSL = (H: string) => {
  // Convert hex to RGB first
  let r = 0;
  let g = 0;
  let b = 0;
  if (H.length === 4) {
    r = parseInt(`0x${H[1]}${H[1]}`, 16);
    g = parseInt(`0x${H[2]}${H[2]}`, 16);
    b = parseInt(`0x${H[3]}${H[3]}`, 16);
  } else if (H.length === 7) {
    r = parseInt(`0x${H[1]}${H[2]}`, 16);
    g = parseInt(`0x${H[3]}${H[4]}`, 16);
    b = parseInt(`0x${H[5]}${H[6]}`, 16);
  } else {
    return [0, 0, 0];
  }
  // Then to HSL
  r /= 255;
  g /= 255;
  b /= 255;
  const cmin = Math.min(r, g, b);
  const cmax = Math.max(r, g, b);
  const delta = cmax - cmin;
  let h = 0;
  let s = 0;
  let l = 0;

  if (delta === 0) {
    h = 0;
  } else if (cmax === r) {
    h = ((g - b) / delta) % 6;
  } else if (cmax === g) {
    h = (b - r) / delta + 2;
  } else {
    h = (r - g) / delta + 4;
  }

  h = Math.round(h * 60);

  if (h < 0) {
    h += 360;
  }

  l = (cmax + cmin) / 2;
  s = delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));
  s = +(s * 100).toFixed(1);
  l = +(l * 100).toFixed(1);

  return [h, s, l];
};

/*!
 * Get the contrasting color for any hex color
 * (c) 2019 Chris Ferdinandi, MIT License, https://gomakethings.com
 * Derived from work by Brian Suda, https://24ways.org/2010/calculating-color-contrast/
 * @param  {String} A hexcolor value
 * @return {String} The contrasting color (black or white)
 */
export const getContrast = (hexcolor: string) => {
  // If a leading # is provided, remove it
  if (hexcolor.slice(0, 1) === '#') {
    hexcolor = hexcolor.slice(1);
  }

  // If a three-character hexcode, make six-character
  if (hexcolor.length === 3) {
    hexcolor = hexcolor
      .split('')
      .map((hex) => hex + hex)
      .join('');
  }

  // Convert to RGB value
  const r = parseInt(hexcolor.substr(0, 2), 16);
  const g = parseInt(hexcolor.substr(2, 2), 16);
  const b = parseInt(hexcolor.substr(4, 2), 16);

  // Get YIQ ratio
  return (r * 299 + g * 587 + b * 114) / 1000;
};

export const getColorFromBackground = (backHex: string): 'black' | 'white' => {
  // const hsl = hexToHSL(backHex);
  // const [, sat, lum] = hsl;
  // return lum < 50 || (lum < 60 && sat > 75) ? 'white' : 'black';
  return getContrast(backHex) >= 128 ? 'black' : 'white';
};

////////////////////
//// Misc utils ////
////////////////////

export const hashString = (s: string) => {
  let hash = 0;
  let chr = 0;
  if (s.length === 0) {
    return hash;
  }
  for (let i = 0; i < s.length; i++) {
    chr = s.charCodeAt(i);
    // tslint:disable-next-line: no-bitwise
    hash = (hash << 5) - hash + chr;
    // tslint:disable-next-line: no-bitwise
    hash |= 0; // Convert to 32bit integer
  }
  return hash;
};

export const getThumbnailPath = (filePath: string, thumbnailDirectory: string): string => {
  const baseFilename = path.basename(filePath, path.extname(filePath));

  // Hash is needed to avoid files with the same name to clash with each other, when they come from different paths
  const hash = hashString(filePath);

  return path.join(thumbnailDirectory, `${baseFilename}-${hash}.${thumbnailType}`);
};

/** Use this for any <img src attribute! */
export function encodeFilePath(filePath: string): string {
  // Take into account weird file names like "C:/Images/https_%2F%2Fcdn/.../my-image.jpg"
  const basename = path.basename(filePath);
  return filePath.substr(0, filePath.length - basename.length) + encodeURI(basename);
}

export function needsThumbnail(width: number, height: number) {
  return width > thumbnailMaxSize || height > thumbnailMaxSize;
}

export const isDirEmpty = async (dir: string) => {
  const dirContents = await fse.readdir(dir);
  return dirContents.length === 0 || (dirContents.length === 1 && dirContents[0] === '.DS_Store');
};

export const clamp = (value: number, min: number, max: number): number => {
  if (value > max) {
    return max;
  } else if (value < min) {
    return min;
  } else {
    return value;
  }
};

/**
 * Format bytes as human-readable text.
 * From: https://stackoverflow.com/a/14919494/2350481
 * @param bytes Number of bytes.
 * @param si True to use metric (SI) units, aka powers of 1000. False to use
 *           binary (IEC), aka powers of 1024.
 * @param dp Number of decimal places to display.
 * @return Formatted string.
 */
export function humanFileSize(bytes: number, si = false, dp = 1) {
  const thresh = si ? 1000 : 1024;

  if (Math.abs(bytes) < thresh) {
    return bytes + ' B';
  }

  const units = si
    ? ['kB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']
    : ['KiB', 'MiB', 'GiB', 'TiB', 'PiB', 'EiB', 'ZiB', 'YiB'];
  let u = -1;
  const r = 10 ** dp;

  do {
    bytes /= thresh;
    ++u;
  } while (Math.round(Math.abs(bytes) * r) / r >= thresh && u < units.length - 1);

  return bytes.toFixed(dp) + ' ' + units[u];
}

export const IS_MAC = process.platform === 'darwin';
export const IS_WIN = process.platform === 'win32';
