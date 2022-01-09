import path from 'path';
import { RendererMessenger } from './Messaging';
import os from 'os';

export function isDev() {
  return process.env.NODE_ENV === 'development';
}

// Randomly chosen, hopefully no conflicts with other apps/services
export const SERVER_PORT = 5454;

export const githubUrl = 'https://github.com/allusion-app/VisualLibrary';

export const chromeExtensionUrl =
  'https://chrome.google.com/webstore/detail/allusion-web-clipper/gjceheijjnmdfcolopodbopfoaicobna';

export const RECURSIVE_DIR_WATCH_DEPTH = 16;

export const thumbnailFormat = 'webp';

const isRenderer = process.type === 'renderer';

// Use higher thumbnail resolution for HiDPI screens
// A value of 1 indicates a classic 96 DPI (76 DPI on some platforms) display, while a value of 2 is expected for HiDPI/Retina displays.
// The values 600 : 400 needed to be flipped in order to get 600 on OSX Retina
export const thumbnailMaxSize = isRenderer && globalThis.devicePixelRatio >= 1.5 ? 400 : 600;

export async function getDefaultThumbnailDirectory() {
  const userDataPath = await RendererMessenger.getPath('temp');
  return path.join(userDataPath, 'Allusion', 'thumbnails');
}

export async function getDefaultBackupDirectory() {
  const userDataPath = await RendererMessenger.getPath('userData');
  return path.join(userDataPath, 'backups');
}

/**
 * Creates the body of a bug report
 * @param error The error message (error.stack if available)
 * @param version Get through getVersion in the main process or RenderMessenger.getVersion in the renderer process
 * @returns
 */
export const createBugReport = (
  error: string,
  version: string,
) => `<!--- Thanks for wanting to file a bug report! Please check if your issue is not a duplicate before posting -->
<b>Which actions did you perform before the error occurred?</b>
...

<b>What did you expect to happen?</b>
<!--- Feel free to leave this out if irrelevant -->
...

<b>Stacktrace</b>
\`\`\`
${error}
\`\`\`

<b>Runtime info</b>
<ul>
<li>Allusion version: v${version}</li>
<li>Operating system: ${os.type()} ${os.release()}, ${process.platform} ${process.arch}</li>
<li>Node version: ${process.version}</li>
</ul>
`;
