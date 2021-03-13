// This file is our connector for reading/writing EXIF metadata, using ExifTool under the hood.
// Initially I wanted to make use of the exiftool-vendored dependency, since it's seems
// quite nicely set-up and is still being maintained. Getting it to work in Electron
// was a real pain and I gave up. I read about others not being able to get it to work on MacOS
// and I can't test that personally, so I want with an alternative: node-exiftool

/**
 * Braindump:
 * When we need to write:
 * - When tags are added/removed to a file (duh)
 * - When a tag is renamed: write it to all files
 * - When a tag is moved in the hierarchy
 *
 * When to read:
 * - When adding new location, like we currently do with image resolution (could replace that with exiftool)
 * - On start-up, look for changed tags (like we do with checking whether files still exist)
 * - On file-change (file watcher)
 *
 * Other things:
 * - Would be cool to show all exif info in inspector
 */

import exiftool from 'node-exiftool';
import path from 'path';
import { isDev } from '../config';

console.log({ isDev: isDev() });

// Load the native exiftool executable. In production mode, it's one extra folder up, since it starts in the asar archive
const exiftoolFolderAndFile = process.platform === 'win32' ? 'win/exiftool.exe' : 'nix/exiftool.pl';
const exiftoolPath = path.resolve(
  __dirname,
  (isDev() ? '' : '../') + '../resources/exiftool',
  exiftoolFolderAndFile,
);

console.log(exiftoolPath);
const ep = new exiftool.ExiftoolProcess(exiftoolPath);

class ExifIO {
  async initialize() {
    // const version = await exiftool.version();
    // console.log(`We're running ExifTool v${version}`);
    const pid = await ep.open();

    // display pid
    console.log('Started exiftool process %s', pid);
  }
  print() {
    console.log(ep);
  }
  async close() {
    await ep.close();
    console.log('Closed Exiftool');
  }
  async readTags(filepath: string, separator = ' | ') {
    // V1: exiftool vendored
    // const metadata = await exiftool.read(filepath);

    // v2: node exitfool
    // TODO: Can read whole folder (batching): https://www.npmjs.com/package/node-exiftool#reading-directory
    // const metadata = await ep.readMetadata(filepath, ['-File:all']);
    const metadata = await ep.readMetadata(filepath, [
      'HierarchicalSubject',
      'Subject',
      'Keywords',
    ]);
    if (metadata.error || !metadata.data?.[0]) {
      throw new Error(metadata.error || 'No metadata entry');
    }

    const entry = metadata.data[0];

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
    // TODO: Need to make a decision: if TagHierarchy is defined, use that. Otherwise, fall back to Subject or Keywords.
    // But what if they both have entries, without overlap? Join them?
    // Filter out duplicates of tagHierarchy and the other plain tags:
    const filteredTags = allTags.filter((tag) =>
      splitHierarchy.every((h) => h[h.length - 1] !== tag),
    );

    if (tagHierarchy.length + filteredTags.length > 0) {
      console.log(JSON.stringify({ tagHierarchy, subject, keywords }, null, 2));
    }
    return [...tagHierarchy, ...filteredTags];
  }

  async writeTags(filepath: string, tagHierarchy: string[]) {
    // TODO: Could also write the meta-metadata, e.g.:
    // History Action                  : saved
    // History Instance ID             : xmp.iid:14020DA03863EB11B2D999D21045C35B
    // History When                    : 2021:01:30 21:20:41+01:00
    // History Software Agent          : Adobe Bridge CS6 (Windows)

    const subject = tagHierarchy.map((entry) => entry.split('|').pop()!);

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
}

export default ExifIO;
