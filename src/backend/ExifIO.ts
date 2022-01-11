// This file is our connector for reading/writing EXIF metadata, using ExifTool under the hood.
// Initially I wanted to make use of the exiftool-vendored dependency, since it's seems
// quite nicely set-up and is still being maintained. Getting it to work in Electron
// was a real pain and I gave up. I read about others not being able to get it to work on MacOS
// and I can't test that personally, so I went with an alternative: node-exiftool.
// -
// The other one (exiftool-vendored) claims to have much better performance though,
// should give it another go sometime, perhaps even forking it and add better electron/webpack
// compatibility.

// Note about the terminology:
// - In Allusion, we call "tags" the labels you can assign to images
// - In ExifTool, any attribute in the metadata of an image is called a "tag"
//   The type of tags we use in Allusion are stored in the "Subject", "Keyword"
//   and "HierarchicalSubject" attributes - this last one being special, e.g. "Body | Arm | Hand"

/**
 * Braindump:
 * When we need to write:
 * - When tags are added/removed to a file (duh)
 * - When a tag is renamed: write it to all files tagged with it
 * - When a tag is moved to a different parent in the hierarchy: also write to all files
 * note: these should all be batchable
 *
 * When to read:
 * - When adding new location, like we currently do with image resolution (could replace that with exiftool)
 * - On start-up, look for changed tags (like we do with checking whether files still exist)
 * - On file-change (file watcher)
 * note: exiftool can read all files in a directory recursively
 *
 * Other things:
 * - Would be cool to show all exif info in inspector
 */

// v2: node exitfool
// TODO: Can read whole folder (batching): https://www.npmjs.com/package/node-exiftool#reading-directory
// Even subfolders with -r, e.g. remove all metadata in all subfolders using `exiftool -r -all= -overwrite_original MyFolder .`
// https://exiftool.org/#performance
// Capabilities
// - batch processing capabilities: the ability to process multiple files or entire directories with a single command
// - execute option may be used to perform multiple independent operations with a single invocation of exiftool
// finds:
// - automatically update Subject/Keywords when updating HierarchicalSubject: https://exiftool.org/forum/index.php?topic=9208.0
// Update: only doing an export/import for all images for now, not real-time updates

import fse from 'fs-extra';
import { action, makeObservable, observable, runInAction } from 'mobx';
import exiftool from 'node-exiftool';
import path from 'path';
import { isDev } from 'src/config';
import { Sequence } from 'common/sequence';
import { IS_WIN } from 'src/frontend/utils';

// The exif binary is placed using ElectronBuilder's extraResources: https://www.electron.build/configuration/contents#extraresources
// there also is process.resourcesPath but that doesn't work in dev mode
const resourcesPath = (isDev() ? '../' : '../../') + 'resources' + '/exiftool';
const exiftoolRunnable = process.platform === 'win32' ? 'exiftool.exe' : 'exiftool.pl';
const exiftoolPath = path.resolve(__dirname, resourcesPath, exiftoolRunnable);

console.log('Exif tool path: ', exiftoolPath);
const ep = new exiftool.ExiftoolProcess(exiftoolPath);

class ExifIO {
  @observable hierarchicalSeparator: string;

  private isOpening = false;

  // For accented characters and foreign alphabets, an extra arg is needed on Windows
  // https://www.npmjs.com/package/node-exiftool#reading-utf8-encoded-filename-on-windows
  extraArgs = IS_WIN ? ['charset filename=utf8'] : [];

  constructor() {
    this.hierarchicalSeparator = localStorage.getItem('hierarchical-separator') ?? '|';

    makeObservable(this);
  }

  isOpen(): boolean {
    return ep._open === true;
  }

  async initialize(): Promise<ExifIO> {
    if (ep._open === true) {
      return this;
    }
    if (!this.isOpening) {
      this.isOpening = true;
      const pid = await ep.open();
      console.log('Started exiftool process %s', pid);
    } else {
      await new Promise<void>((resolve) =>
        setInterval(() => {
          if (ep._open === true) {
            resolve();
          }
        }, 50),
      );
    }
    return this;
  }

  async close(): Promise<void> {
    if (ep._open === true) {
      console.log('Closing Exiftool...');
      await ep.close();
      console.log('Closed Exiftool');
    }
  }

  @action.bound setHierarchicalSeparator(val: string): void {
    this.hierarchicalSeparator = val;
    localStorage.setItem('hierarchical-separator', val);
  }

  // ------------------

  /** Merges the HierarchicalSubject, Subject and Keywords into one list of tags, removing any duplicates */
  static convertMetadataToHierarchy(entry: exiftool.IMetadata, separator: string): string[][] {
    // these toString() methods are here because they are automatically parsed to numbers if they could be numbers :/
    const parseExifFieldAsString = (val: unknown): Sequence<string> => {
      if (Array.isArray(val)) {
        return Sequence.from(val).map((s) => String(s));
      } else if (val !== undefined && val !== null) {
        return Sequence.once(String(val));
      } else {
        return Sequence.empty();
      }
    };

    const tagHierarchy = parseExifFieldAsString(entry.HierarchicalSubject);
    const subject = parseExifFieldAsString(entry.Subject);
    const keywords = parseExifFieldAsString(entry.Keywords);

    const splitHierarchy = tagHierarchy.map((h) => h.split(separator)).collect();
    // Filter out duplicates of tagHierarchy and the other plain tags:
    const filteredTags = Sequence.from(new Set(subject.chain(keywords))).filterMap((tag) => {
      if (splitHierarchy.every((h) => h[h.length - 1] !== tag)) {
        return [tag];
      } else {
        return undefined;
      }
    });
    return [...splitHierarchy, ...filteredTags];
  }

  async readTags(filepath: string): Promise<string[][]> {
    const metadata = await ep.readMetadata(filepath, [
      'HierarchicalSubject',
      'Subject',
      'Keywords',
      ...this.extraArgs,
    ]);
    if (metadata.error !== null || metadata.data === null || metadata.data.length === 0) {
      throw new Error(metadata.error ?? 'No metadata entry');
    }
    const entry = metadata.data[0];
    return ExifIO.convertMetadataToHierarchy(
      entry,
      runInAction(() => this.hierarchicalSeparator),
    );
  }

  async readExifTags(filepath: string, tags: string[]): Promise<string[]> {
    const metadata = await ep.readMetadata(filepath, [...tags, ...this.extraArgs]);
    if (metadata.error !== null || metadata.data === null || metadata.data.length === 0) {
      throw new Error(metadata.error ?? 'No metadata entry');
    }
    const entry = metadata.data[0];
    return Sequence.from(tags)
      .filterMap((t) =>
        entry[t] !== undefined && entry[t] !== null ? entry[t].toString() : undefined,
      )
      .collect();
  }

  /** Reads file metadata for all files in a folder (and recursively for its subfolders) */
  // async readTagsRecursively(directory: string) {
  //   const metadata = await ep.readMetadata(directory, [
  //     'HierarchicalSubject',
  //     'Subject',
  //     'Keywords',
  //     'r',
  //   ]);
  //   if (metadata.error || !metadata.data?.[0]) {
  //     throw new Error(metadata.error || 'No metadata entries found');
  //   }
  //   const entry = metadata.data[0];
  //   return ExifIO.convertMetadataToHierarchy(
  //     entry,
  //     runInAction(() => this.hierarchicalSeparator),
  //   );
  // }

  /** Overwrites the tags of a specific file */
  @action.bound async writeTags(
    filepath: string,
    tagNameHierarchy: (readonly string[])[],
  ): Promise<void> {
    // TODO: Could also write the meta-metadata, e.g.:
    // History Action                  : saved
    // History Instance ID             : xmp.iid:14020DA03863EB11B2D999D21045C35B
    // History When                    : 2021:01:30 21:20:41+01:00
    // History Software Agent          : Adobe Bridge CS6 (Windows)

    // Writing to multiple files: `exiftool -artist=me a.jpg b.jpg c.jpg`
    // Can add and remove simultaneously with `exiftool -keywords+="add this" -keywords-="remove this"`
    // Multiple at once with `-sep ", " -keywords="one, two, three"`

    if (tagNameHierarchy.length === 0) {
      return;
    }

    const subject = tagNameHierarchy.map((entry) => entry[entry.length - 1]);

    console.log('Writing', tagNameHierarchy.join(', '), 'to', filepath);

    const res = await ep.writeMetadata(
      filepath,
      {
        HierarchicalSubject: tagNameHierarchy.map((hierarchy) =>
          hierarchy.join(this.hierarchicalSeparator),
        ),
        Subject: subject,
        Keywords: subject,
        // History: {},
      },
      [
        'overwrite_original', // added this because it was leaving behind duplicate files (with _original appended to filename)
        'codedcharacterset=utf8', // needed for adobe products: https://www.npmjs.com/package/node-exiftool#writing-tags-for-adobe-in-utf8
        'P', // for preserving the modified date of files
        ...this.extraArgs,
      ],
    );
    if (res.error?.endsWith('1 image files updated') !== true) {
      console.error('Could not update file metadata', res);
    }
  }

  /** Adds */
  // async addTag(files: string[], tagHierarchy: string[]) {
  //   // concat file paths into one big string, each surrounded by double quotes
  //   const command = files.map((filePath) => `"${filePath}"`).join(' ');
  //   const res = await ep.writeMetadata(
  //     command,
  //     // the "MyHS" is a custom exiftool tag, see the .Exilfool_config file for more details
  //     { 'MyHS+': tagHierarchy },
  //     ['overwrite_original '], // added this because it was leaving behind duplicate files (with _original appended to filename)
  //   );
  //   if (!res.error?.endsWith(`${files.length} image files updated`)) {
  //     console.error('Could not update file metadata', res);
  //   }
  // }
  // async removeTag(files: string[], tagHierarchy: string[]) {
  //   const command = files.map((filePath) => `"${filePath}"`).join(' ');
  //   const res = await ep.writeMetadata(command, { 'MyHS-': tagHierarchy }, ['overwrite_original ']);
  //   if (!res.error?.endsWith(`${files.length} image files updated`)) {
  //     console.error('Could not update file metadata', res);
  //   }
  // }
  // async replaceTag(files: string[], oldTagHierarchy: string[], newTagHierarchy: string[]) {
  //   const command = files.map((filePath) => `"${filePath}"`).join(' ');
  //   const res = await ep.writeMetadata(
  //     command,
  //     {
  //       'MyHS-': oldTagHierarchy,
  //       'MyHS+': newTagHierarchy,
  //     },
  //     ['overwrite_original '], // added this because it was leaving behind duplicate files (with _original appended to filename)
  //   );
  //   if (!res.error?.endsWith(`${files.length} image files updated`)) {
  //     console.error('Could not update file metadata', res);
  //   }
  // }

  async getDimensions(filepath: string): Promise<{ width: number; height: number }> {
    let metadata: Awaited<ReturnType<typeof ep.readMetadata>> | undefined = undefined;
    try {
      metadata = await ep.readMetadata(filepath, [
        's3',
        'ImageWidth',
        'ImageHeight',
        ...this.extraArgs,
      ]);
      if (metadata.error !== null || metadata.data === null || metadata.data.length === 0) {
        throw new Error(metadata.error ?? 'No metadata entry');
      }
      const entry = metadata.data[0];
      const { ImageWidth, ImageHeight } = entry;
      return { width: ImageWidth, height: ImageHeight };
    } catch (e) {
      console.error('Could not read image dimensions from ', filepath, e, metadata);
      return { width: 0, height: 0 };
    }
  }

  /**
   * Extracts the embedded thumbnail of a file into its own separate image file
   * @param input
   * @param output
   * @returns Whether the thumbnail could be extracted successfully
   */
  async extractThumbnail(input: string, output: string): Promise<boolean> {
    // TODO: should be possible to pipe it immediately. Node-exiftool doesn't seem to allow that
    // const manualCommand = `"${input}" -PhotoshopThumbnail -b > "${output}"`;
    // console.log(manualCommand);
    // const res = await ep.readMetadata(manualCommand);
    // console.log(res);

    // TODO: can also extract preview from RAW https://exiftool.org/forum/index.php?topic=7408.0

    const res = await ep.readMetadata(input, ['ThumbnailImage', 'PhotoshopThumbnail', 'b']);

    const data =
      res.data !== null && res.data.length > 0
        ? res.data[0].ThumbnailImage ?? res.data[0].PhotoshopThumbnail
        : undefined;
    if (data !== undefined) {
      if (typeof data === 'string' && data.startsWith('base64')) {
        await fse.writeFile(output, Buffer.from(data.replace('base64:', ''), 'base64'));
      } else {
        await fse.writeFile(output, data);
      }
      return true;
    }
    return false;
  }
}

export default ExifIO;
