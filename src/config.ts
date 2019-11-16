/**
 * Easy way to check whether the application is running in development or production.
 * From https://github.com/electron/electron/issues/7714#issuecomment-255835799
 */
export function isDev() {
  return process.mainModule ? process.mainModule.filename.indexOf('app.asar') === -1 : false;
}

// Randomly chosen, hopefully no conflicts with other apps/services
export const SERVER_PORT = 5454;

export const githubUrl = 'https://github.com/RvanderLaan/VisualLibrary';

export const thumbnailType = 'webp';

const isRenderer = process && process.type === 'renderer';

// Use higher thumbnail resolution for HiDPI screens
// A value of 1 indicates a classic 96 DPI (76 DPI on some platforms) display, while a value of 2 is expected for HiDPI/Retina displays.
// The values 600 : 400 needed to be flipped in order to get 600 on OSX Retina
export const thumbnailMaxSize = isRenderer && window.devicePixelRatio >= 1.5 ? 400 : 600;
