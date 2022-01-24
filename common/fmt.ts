///////////////////////////////
//// Text formatting utils ////
///////////////////////////////
export function formatTagCountText(numTags: number) {
  const extraTagsText = numTags > 1 ? `+${numTags} tag${numTags === 1 ? '' : 's'}` : '';
  return `${extraTagsText}`;
}

export function capitalize(value: string) {
  if (value.length === 0) {
    return '';
  }
  return `${value.charAt(0).toLocaleUpperCase()}${value.slice(1)}`;
}

export function camelCaseToSpaced(value: string) {
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
}

export function ellipsize(
  value: string,
  maxLength = 80,
  type: 'start' | 'middle' | 'end' = 'start',
) {
  if (value.length <= maxLength) {
    return value;
  }
  switch (type) {
    case 'end':
      return value.slice(maxLength) + '…';
    case 'middle':
      return value.slice(0, maxLength / 2) + '…' + value.slice(value.length - maxLength / 2);
    case 'start':
    default:
      return '…' + value.slice(value.length - maxLength);
  }
}

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

export function formatDateTime(d: Date) {
  return DateTimeFormat.formatToParts(d)
    .map(({ type, value }) => (type === 'literal' && value === ', ' ? ' ' : value))
    .reduce((str, part) => str + part);
}

export const jsDateFormatter = {
  formatDate: (date: Date) => date.toLocaleDateString(),
  parseDate: (str: string) => new Date(str),
  placeholder: 'Choose a date...',
};

/** Returns date in YYYYMMDDTHHMMSS format (ISO-string without symbols and milliseconds) */
export function getFilenameFriendlyFormattedDateTime(date: Date) {
  return date.toISOString().replaceAll(/-|:/g, '').slice(0, -5);
}

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
