import { shell } from 'electron';
import fse from 'fs-extra';
import React, { ReactNode } from 'react';
import { ClientFile } from 'src/entities/File';
import { useStore } from '../contexts/StoreContext';
import { Poll, Result, usePromise } from '../hooks/usePromise';
import { formatDateTime, humanFileSize } from '../utils';

type CommonMetadata = {
  name: string;
  dimensions: string;
  size: string;
  imported: string;
  created: string;
  modified: string;
};

const commonMetadataLabels: Record<keyof CommonMetadata, string> = {
  name: 'Filename',
  dimensions: 'Dimensions',
  size: 'Size',
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
  ImageDescription: { label: 'Description' },
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

interface ImageInfoProps {
  file: ClientFile;
}

const ImageInfo = ({ file }: ImageInfoProps) => {
  const { fileStore } = useStore();

  const modified: Poll<Result<string, any>> = usePromise(file.absolutePath, async (filePath) => {
    const stats = await fse.stat(filePath);
    return formatDateTime(stats.ctime);
  });

  const fileStats: CommonMetadata = {
    name: file.name,
    dimensions: `${file.width || '?'} x ${file.height || '?'}`,
    size: humanFileSize(file.size),
    imported: formatDateTime(file.dateAdded),
    created: formatDateTime(file.dateCreated),
    modified:
      modified.tag === 'ready' && modified.value.tag === 'ok' ? modified.value.value : '...',
  };

  const exifData: Poll<Result<{ [key: string]: ReactNode }, any>> = usePromise(
    file.absolutePath,
    fileStore.exifTool,
    async (filePath, exifTool) => {
      const tagValues = await exifTool.readExifTags(filePath, exifTags);
      const extraStats: Record<string, ReactNode> = {};
      tagValues.forEach((val, i) => {
        if (val !== '' && val !== undefined) {
          const field = exifFields[exifTags[i]];
          extraStats[field.label] = field.format?.(val) || val;
        }
      });
      return extraStats;
    },
  );

  const extraStats =
    exifData.tag === 'ready' && exifData.value.tag === 'ok'
      ? Object.entries(exifData.value.value)
      : [];

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
        {extraStats.map(([label, value]) => (
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
