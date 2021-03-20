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

import exiftool from 'node-exiftool';
import path from 'path';
import { isDev } from '../config';

console.log({ isDev: isDev() });

// Load the native exiftool executable. In production mode, it's one extra folder up, since it starts in the asar archive
const exiftoolFolderAndFile = process.platform === 'win32' ? 'exiftool.exe' : 'exiftool.pl';
const exiftoolPath = path.resolve(
  __dirname,
  (isDev() ? '' : '../') + '../resources/exiftool',
  exiftoolFolderAndFile,
);

console.log(exiftoolPath);
const ep = new exiftool.ExiftoolProcess(exiftoolPath);

class ExifIO {
  hierarchicalSeparator: string;

  constructor(hierarchicalSeparator = ' | ') {
    this.hierarchicalSeparator = hierarchicalSeparator;
  }

  async initialize() {
    // const version = await exiftool.version();
    // console.log(`We're running ExifTool v${version}`);
    const pid = await ep.open();

    // display pid
    console.log('Started exiftool process %s', pid);
  }
  async close() {
    console.log('Closing Exiftool...');
    await ep.close();
    console.log('Closed Exiftool');
  }

  /** Merges the HierarchicalSubject, Subject and Keywords into one list of tags, removing any duplicates */
  static convertMetadataToHierarchy(entry: exiftool.IMetadata, separator: string): string[] {
    const tagHierarchy =
      typeof entry.HierarchicalSubject === 'string'
        ? [entry.HierarchicalSubject]
        : entry.HierarchicalSubject || [];
    const subject = typeof entry.Subject === 'string' ? [entry.Subject] : entry.Subject || [];
    const keywords = typeof entry.Keywords === 'string' ? [entry.Keywords] : entry.Keywords || [];

    // these toString() methods are here because they are automatically parsed to numbers if they could be numbers :/
    const splitHierarchy = tagHierarchy.map((h) => h.toString().split(separator));
    const allTags = Array.from(
      new Set([...subject.map((s) => s.toString()), ...keywords.map((s) => s.toString())]),
    );

    // Filter out duplicates of tagHierarchy and the other plain tags:
    const filteredTags = allTags.filter((tag) =>
      splitHierarchy.every((h) => h[h.length - 1] !== tag),
    );

    if (tagHierarchy.length + filteredTags.length > 0) {
      console.log(JSON.stringify({ tagHierarchy, subject, keywords }, null, 2));
    }
    return [...tagHierarchy, ...filteredTags];
  }
  async readTags(filepath: string) {
    const metadata = await ep.readMetadata(filepath, [
      'HierarchicalSubject',
      'Subject',
      'Keywords',
    ]);
    if (metadata.error || !metadata.data?.[0]) {
      throw new Error(metadata.error || 'No metadata entry');
    }
    const entry = metadata.data[0];
    return ExifIO.convertMetadataToHierarchy(entry, this.hierarchicalSeparator);
  }

  async readTagsRecursively(directory: string) {
    const metadata = await ep.readMetadata(directory, [
      'HierarchicalSubject',
      'Subject',
      'Keywords',
      'r',
    ]);
    if (metadata.error || !metadata.data?.[0]) {
      throw new Error(metadata.error || 'No metadata entries found');
    }
    const entry = metadata.data[0];
    return ExifIO.convertMetadataToHierarchy(entry, this.hierarchicalSeparator);
  }

  /** Overwrites the tags of a specific file */
  async writeTags(filepath: string, tagHierarchy: string[]) {
    // TODO: Could also write the meta-metadata, e.g.:
    // History Action                  : saved
    // History Instance ID             : xmp.iid:14020DA03863EB11B2D999D21045C35B
    // History When                    : 2021:01:30 21:20:41+01:00
    // History Software Agent          : Adobe Bridge CS6 (Windows)

    // Writing to multiple files: `exiftool -artist=me a.jpg b.jpg c.jpg`
    // Can add and remove simultaneously with `exiftool -keywords+="add this" -keywords-="remove this"`
    // Multiple at once with `-sep ", " -keywords="one, two, three"`

    const subject = tagHierarchy.map((entry) => entry.split(this.hierarchicalSeparator).pop()!);

    console.log('Writing', tagHierarchy.join(', '), 'to', filepath);

    const res = await ep.writeMetadata(
      filepath,
      {
        HierarchicalSubject: tagHierarchy,
        Subject: subject,
        Keywords: subject,
        // History: {},
      },
      ['overwrite_original '], // added this because it was leaving behind duplicate files (with _original appended to filename)
    );
    console.log(res);
    if (!res.error?.endsWith('1 image files updated')) {
      console.error('Could not update file metadata', res);
    }
  }

  /** Adds */
  async addTag(files: string[], tagHierarchy: string[]) {
    // concat file paths into one big string, each surrounded by double quotes
    const command = files.map((filePath) => `"${filePath}"`).join(' ');
    const res = await ep.writeMetadata(
      command,
      { 'MyHS+': tagHierarchy },
      ['overwrite_original '], // added this because it was leaving behind duplicate files (with _original appended to filename)
    );
    console.log(res);
    if (!res.error?.endsWith(`${files.length} image files updated`)) {
      console.error('Could not update file metadata', res);
    }
  }
  async removeTag(files: string[], tagHierarchy: string[]) {
    const command = files.map((filePath) => `"${filePath}"`).join(' ');
    const res = await ep.writeMetadata(command, { 'MyHS-': tagHierarchy }, ['overwrite_original ']);
    console.log(res);
    if (!res.error?.endsWith(`${files.length} image files updated`)) {
      console.error('Could not update file metadata', res);
    }
  }
  async replaceTag(files: string[], oldTagHierarchy: string[], newTagHierarchy: string[]) {
    const command = files.map((filePath) => `"${filePath}"`).join(' ');
    const res = await ep.writeMetadata(
      command,
      {
        'MyHS-': oldTagHierarchy,
        'MyHS+': newTagHierarchy,
      },
      ['overwrite_original '], // added this because it was leaving behind duplicate files (with _original appended to filename)
    );
    console.log(res);
    if (!res.error?.endsWith(`${files.length} image files updated`)) {
      console.error('Could not update file metadata', res);
    }
  }
}

export default ExifIO;
