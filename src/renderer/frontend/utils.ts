import path from 'path';
import { thumbnailType } from '../../config';

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

export function hexToHSL(H: string) {
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
}

export function getClassForBackground(backHex: string) {
  const hsl = hexToHSL(backHex);
  const [, sat, lum] = hsl;

  return (
    lum < 50
    || (lum < 60 && sat > 75)
  ) ? 'color-white' : 'color-black';
}

export const getThumbnailPath = (filePath: string, thumbnailDirectory: string): string => {
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
