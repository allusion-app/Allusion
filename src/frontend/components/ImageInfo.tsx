import { shell } from 'electron';
import fse from 'fs-extra';
import React, { ReactNode, useContext, useEffect, useState } from 'react';
import { ClientFile } from 'src/entities/File';
import StoreContext from '../contexts/StoreContext';
import { formatDateTime } from '../utils';

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
  // TODO: modified in allusion vs modified in system?
  created: 'Created',
  modified: 'Modified',
};

// Details: https://www.vcode.no/web/resource.nsf/ii2lnug/642.htm
const exifFields: Record<string, { label: string; format?: (val: string) => ReactNode }> = {
  PhotometricInterpretation: { label: 'Color Mode' },
  BitsPerSample: { label: 'Bit Depth' },
  Software: { label: 'Creation Software' },
  Artist: { label: 'Creator' },
  CreatorWorkURL: {
    label: 'Creator URL',
    format: function CreatorURL(url: string) {
      return (
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          onClick={(e) => {
            e.preventDefault();
            shell.openExternal(url);
          }}
        >
          {url}
        </a>
      );
    },
  },
  Copyright: { label: 'Copyright' },
  Make: { label: 'Camera Manufacturer' },
  Model: { label: 'Camera Model' },
  Megapixels: { label: 'Megapixels' },
  ExposureTime: { label: 'Exposure Time' },
  FNumber: { label: 'F-stop' },
  FocalLength: { label: 'Focal Length' },
  GPSLatitude: { label: 'GPS Latitude' },
  GPSLongitude: { label: 'GPS Longitude' },
};

const exifTags = Object.keys(exifFields);

interface IImageInfo {
  /** This is used to avoid making sys calls while the user is scrolling! */
  suspended?: boolean;
  file: ClientFile;
}

const ImageInfo = ({ suspended = false, file }: IImageInfo) => {
  const { fileStore } = useContext(StoreContext);

  const [fileStats, setFileStats] = useState<CommonMetadata>({
    name: file.name,
    dimensions: `${file.width || '?'} x ${file.height || '?'}`,
    imported: formatDateTime(file.dateAdded),
    created: formatDateTime(file.dateCreated),
    modified: '...',
  });

  const [exifData, setExifData] = useState<{ [key: string]: ReactNode }>({});

  useEffect(() => {
    if (suspended) {
      return;
    }
    // Reset file stats when file changes
    setFileStats({
      name: file.name,
      dimensions: `${file.width || '?'} x ${file.height || '?'}`,
      imported: formatDateTime(file.dateAdded),
      created: formatDateTime(file.dateCreated),
      modified: '...',
    });
    // Then look up extra stats
    const filePath = file.absolutePath;
    let isMounted = true;
    fse
      .stat(filePath)
      .then((stats) => {
        if (isMounted) {
          setFileStats((prev) => ({
            ...prev,
            modified: formatDateTime(stats.ctime),
          }));
        }
      })
      .catch(() => {
        if (isMounted) {
          setFileStats((s) => ({
            ...s,
            modified: '...',
          }));
        }
      });

    fileStore.exifTool?.initialize().then((exifIO) =>
      exifIO
        .readExifTags(filePath, exifTags)
        .then((tagValues) => {
          const extraStats: Record<string, ReactNode> = {};
          tagValues.forEach((val, i) => {
            if (val !== '' && val !== undefined) {
              const field = exifFields[exifTags[i]];
              extraStats[field.label] = field.format?.(val) || val;
            }
          });
          if (isMounted) setExifData(extraStats);
        })
        .catch(() => setExifData({})),
    );

    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file]);

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
