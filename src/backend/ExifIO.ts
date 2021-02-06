import { exiftool } from 'exiftool-vendored';

// Using exiftool-vendored for reading/writing exif data to images
// Looks like the best modern exif-tool wrapper that is being maintained
// And has (some) support for Electron
// See https://github.com/photostructure/exiftool-vendored.js

class ExifIO {
  async initialize() {
    const version = await exiftool.version();
    console.log(`We're running ExifTool v${version}`);
  }
  async readTags(filepath: string) {
    const metadata = await exiftool.read(filepath);
    const tagHierarchy = metadata.HierarchicalSubject || [];
    const subject =
      typeof metadata.Subject === 'string' ? [metadata.Subject] : metadata.Subject || [];
    const keywords =
      typeof metadata.Keywords === 'string' ? [metadata.Keywords] : metadata.Keywords || [];

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
    await exiftool.write(filepath, {
      HierarchicalSubject: tagHierarchy,
      Subject: subject,
      Keywords: subject,
      // History: {},
    });
    console.log('done!');
  }
}

export default ExifIO;
