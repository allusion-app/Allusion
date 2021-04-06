import React, { useContext, useEffect, useState } from 'react';
import fse from 'fs-extra';
import { imageSize } from 'image-size';
import { promisify } from 'util';
const sizeOf = promisify(imageSize);

import { ClientFile } from 'src/entities/File';
import { formatDateTime } from '../utils';
import StoreContext from '../contexts/StoreContext';

type CommonMetadata = {
  name: string;
  dimensions: string;
  imported: string;
  created: string;
  modified: string;
};

const commonMetadataLabels: Record<keyof CommonMetadata, string> = {
  name: 'Filename',
  dimensions: 'Dimensions',
  imported: 'Imported',
  // TODO: "modified in allusion vs modified in system?"
  created: 'Created',
  modified: 'Modified',
};

// Details: https://www.vcode.no/web/resource.nsf/ii2lnug/642.htm
const exifFields: { label: string; exifTag: string }[] = [
  { label: 'Color mode', exifTag: 'PhotometricInterpretation' },
  { label: 'Bit depth', exifTag: 'BitsPerSample' },
  { label: 'Creation software', exifTag: 'Software' },
  { label: 'Creator', exifTag: 'Artist' },
  { label: 'Copyright', exifTag: 'Copyright' },
  { label: 'Camera manufacturer', exifTag: 'Make' },
  { label: 'Camera model', exifTag: 'Model' },
  { label: 'GPS Latitude', exifTag: 'GPSLatitudeRef' },
  { label: 'GPS Longitude', exifTag: 'GPSLongitudeRef' },
];

const exifFieldTags = exifFields.map((e) => e.exifTag);

interface IImageInfo {
  /** This is used to avoid making sys calls while the user is scrolling! */
  suspended?: boolean;
  file: ClientFile;
}

const ImageInfo = ({ suspended = false, file }: IImageInfo) => {
  const { fileStore } = useContext(StoreContext);

  const [fileStats, setFileStats] = useState<CommonMetadata>({
    name: file.name,
    imported: formatDateTime(file.dateAdded),
    created: '...',
    modified: '...',
    dimensions: '...',
  });

  const [exifData, setExifData] = useState<{ [key: string]: string }>({});

  const filePath = file.absolutePath;
  useEffect(() => {
    if (suspended) {
      return;
    }
    let isMounted = true;
    Promise.all([fse.stat(filePath), sizeOf(filePath)])
      .then(([stats, dimensions]) => {
        if (isMounted) {
          setFileStats((s) => ({
            ...s,
            created: formatDateTime(file.dateCreated),
            modified: formatDateTime(stats.ctime),
            lastOpened: formatDateTime(stats.atime),
            dimensions:
              dimensions !== undefined ? `${dimensions.width} x ${dimensions.height}` : '...',
          }));
        }
      })
      .catch(() => {
        if (isMounted) {
          setFileStats((s) => ({
            ...s,
            created: '...',
            modified: '...',
            lastOpened: '...',
            dimensions: '...',
          }));
        }
      });

    fileStore.exifTool?.initialize().then((exifIO) =>
      exifIO.readExifTags(filePath, exifFieldTags).then((tagValues) => {
        console.log(tagValues);
        const extraStats: Record<string, string> = {};
        tagValues.forEach((val, i) => {
          if (val !== '' && val !== undefined) {
            extraStats[exifFields[i].label] = val;
          }
        });
        if (isMounted) setExifData(extraStats);
      }),
    );

    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filePath]);

  // Todo: Would be nice to also add tooltips explaining what these mean (e.g. diff between dimensions & resolution)
  // Or add the units: pixels vs DPI
  return (
    <table className="file-info">
      <tbody>
        {Object.entries(commonMetadataLabels).map(([field, label]) => (
          <tr key={field}>
            <th scope="row">{label}</th>
            <td>{fileStats[field as keyof CommonMetadata]}</td>
          </tr>
        ))}
        {Object.entries(exifData).map(([label, value]) => (
          <tr key={label}>
            <th scope="row">{label}</th>
            <td>{value}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

export default React.memo(ImageInfo);
