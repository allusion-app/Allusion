// import { exiftool } from 'exiftool-vendored';

// Attempt 1:
// Using exiftool-vendored for reading/writing exif data to images
// Looks like the best modern exif-tool wrapper that is being maintained
// And has (some) support for Electron
// See https://github.com/photostructure/exiftool-vendored.js
// Update: Still haven't managed to get it working in a packeged set-up, but I'm getting errors about different things now (electron-updater)
// But while debugging, I came across this post: https://stackoverflow.com/a/56296986/2350481
// "Since I never found a way to get exiftool-vendored to work with electron on Mac, I accepted the above answer, as essentially a warning to steer clear of exiftool-vendored for electron on Mac."
// They went with https://www.npmjs.com/package/node-exiftool in the end. Even seems to work in the renderer process!

// Attempt 2: node-exiftool

import exiftool from 'node-exiftool';
import path from 'path';
import { isDev } from '../config';

// Load the native exiftool executable. In production mode, it's one extra folder up, since it starts in the asar archive
const exiftoolFolderAndFile = process.platform === 'win32' ? 'win/exiftool.exe' : 'nix/exiftool.pl';
const exiftoolPath = path.resolve(
  __dirname,
  isDev() ? '' : '../' + '../resources/exiftool',
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
  async readTags(filepath: string) {
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

    const tagHierarchy = entry.HierarchicalSubject || [];
    const subject = typeof entry.Subject === 'string' ? [entry.Subject] : entry.Subject || [];
    const keywords = typeof entry.Keywords === 'string' ? [entry.Keywords] : entry.Keywords || [];

    const allTags = Array.from(new Set([...subject, ...keywords]));
    // TODO: Need to filter out duplicates of tagHierarchy and the other plain tags
    // const filteredHierarchy = tagHierarchy.filter((x) => allTags.some(t => x.endsWith(t)));

    // TODO: Need to make a decision: if TagHierarchy is defined, use that. Otherwise, fall back to Subject or Keywords.
    // But what if they both have entries, without overlap? Join them?

    if (tagHierarchy.length + subject.length + keywords.length > 0) {
      console.log(JSON.stringify({ tagHierarchy, subject, keywords }, null, 2));
    }
    return [...tagHierarchy, ...allTags];
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
    if (res.error !== '1 image files updated') {
      console.error('Could not update file metadata', res);
    }
  }
}

export default ExifIO;
