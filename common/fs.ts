// Needed for test:
// eslint-disable-next-line @typescript-eslint/no-var-requires
const path = require('path');
import fse from 'fs-extra';
import { thumbnailFormat } from '../common/config';
import { IS_DEV } from './process';

export function getThumbnailPath(filePath: string, thumbnailDirectory: string): string {
  const baseFilename = path.basename(filePath, path.extname(filePath));

  // Hash is needed to avoid files with the same name to clash with each other, when they come from different paths
  const hash = hashString(filePath);

  return path.join(thumbnailDirectory, `${baseFilename}-${hash}.${thumbnailFormat}`);
}

/** Use this for any <img src attribute! */
export function encodeFilePath(filePath: string): string {
  if (filePath.startsWith('data:image') || filePath.startsWith('blob:')) {
    return filePath;
  }
  // Take into account weird file names like "C:/Images/https_%2F%2Fcdn/.../my-image.jpg"
  const basename = path.basename(filePath);
  let basepath = filePath.slice(0, filePath.length - basename.length);
  let filename = filePath.slice(basepath.length);
  // but don't encode url params, we need those to stay intact, e.g. myImage.jpg?v=1
  // unix allows question marks in filenames though, not bothering with that
  let params = '';
  const paramsIndex = filename.lastIndexOf('?');
  // can't be first char of filname, so > 0
  if (paramsIndex > 0) {
    params = filename.slice(paramsIndex);
    filename = filename.slice(0, paramsIndex);
  }
  // edge case for #
  // TODO: there must be others edge cases like this. Why is this so hard? Is there no built-in function for this?
  basepath = basepath.replace(/#/g, '%23');
  return `file://${basepath}${encodeURIComponent(filename)}${params}`;
}

export async function isDirEmpty(dir: string) {
  const dirContents = await fse.readdir(dir);
  return dirContents.length === 0 || (dirContents.length === 1 && dirContents[0] === '.DS_Store');
}

function hashString(s: string) {
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
}

/**
 * Gets the path to a resource set up in `"extraResources`" in the package.json.
 * See https://www.electron.build/configuration/contents#extraresources
 * Could look into process.resourcesPath, but that doesn't seem to work in dev mode
 * @param resourcePath The from from the resources directory, e.g. `"themes/myTheme.css"`
 */
export function getExtraResourcePath(resourcePath: string): string {
  const relativeResourcesPath = (IS_DEV ? '../' : '../../') + 'resources';
  return path.resolve(__dirname, relativeResourcesPath, resourcePath);
}
