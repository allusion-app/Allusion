/**
 * Easy way to check whether the application is running in development or production.
 * From https://github.com/electron/electron/issues/7714#issuecomment-255835799
 */
export function isDev() {
  return process.mainModule ? process.mainModule.filename.indexOf('app.asar') === -1 : false;
}

// Randomly chosen, hopefully no conflicts with other apps/services
export const SERVER_PORT = 5454;
