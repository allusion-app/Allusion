import React from 'react';

import File from '../domain-objects/File';

interface IGalleryProps {
  files: File[];
}

const Gallery = ({
  files,
}: IGalleryProps) => {

  return (
    <>
      {
        files.map((file) => <img src={file.path} className="thumbnail" />)
      }
    </>
  );
};

export default Gallery;
