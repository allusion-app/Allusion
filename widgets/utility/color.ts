/*!
 * Get the contrasting color for any hex color
 * (c) 2019 Chris Ferdinandi, MIT License, https://gomakethings.com
 * Derived from work by Brian Suda, https://24ways.org/2010/calculating-color-contrast/
 * @param  {String} A hexcolor value
 * @return {String} The contrasting color (black or white)
 */
export function getColorFromBackground(backHex: string): 'black' | 'white' {
  // const hsl = hexToHSL(backHex);
  // const [, sat, lum] = hsl;
  // return lum < 50 || (lum < 60 && sat > 75) ? 'white' : 'black';
  return getContrast(backHex) >= 128 ? 'black' : 'white';
}

export function getContrast(hexcolor: string) {
  // If a leading # is provided, remove it
  if (hexcolor.startsWith('#')) {
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
  const r = parseInt(hexcolor.slice(0, 2), 16);
  const g = parseInt(hexcolor.slice(2, 4), 16);
  const b = parseInt(hexcolor.slice(4, 6), 16);

  // Get YIQ ratio
  return (r * 299 + g * 587 + b * 114) / 1000;
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
