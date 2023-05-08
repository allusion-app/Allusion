import { ID } from './id';

export type FileDTO = {
  id: ID;
  /** Identifier for a file that persists after renaming/moving (retrieved from fs.Stats.ino) */
  ino: string;
  locationId: ID;
  /** Path relative to Location */
  relativePath: string;
  absolutePath: string;
  tags: ID[];
  /** When the file was imported into Allusion */
  dateAdded: Date;
  /** When the file was modified in Allusion, not related to OS modified date */
  dateModified: Date;
  /**
   * When the file was last indexed in Allusion: concerning the metadata and thumbnail.
   * If the system's modified date of the file exceeds this date, those properties shoudld be re-initialized
   **/
  dateLastIndexed: Date;

  /** Duplicate data; also exists as part of the absolutePath. Used for DB queries */
  name: string;
  /** in lowercase, without the dot */
  extension: IMG_EXTENSIONS_TYPE;
  /** Size in bytes */
  size: number;
  width: number;
  height: number;
  /** Date when this file was created (from the OS, not related to Allusion) */
  dateCreated: Date;
};

export const IMG_EXTENSIONS = [
  'gif',
  'png',
  'apng',
  'jpg',
  'jpeg',
  'jfif',
  'webp',
  'tif',
  'tiff',
  'bmp',
  'ico',
  'svg',
  'psd',
  'kra',

  // 'xcf', // Gimp
  'exr', // OpenEXR
  // 'raw', there are many RAW file extensions :( https://fileinfo.com/filetypes/camera_raw
  // 'avif',
  // 'heic', // not supported by Sharp out of the box https://github.com/lovell/sharp/issues/2871
  // TODO: 'blend', raw, etc.?
  'mp4',
  'webm',
  'ogg',
] as const;
export type IMG_EXTENSIONS_TYPE = (typeof IMG_EXTENSIONS)[number];
