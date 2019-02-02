import React from 'react';

import { observer } from 'mobx-react-lite';
import File from '../domain-objects/File';

interface IGalleryProps {
  files: File[];
}

const Gallery = ({
  files,
}: IGalleryProps) => {

  return (
    <div>
      {
        files.map((file) => (
          <img
            key={`file-${file.id}`}
            src={file.path} className="thumbnail"
          />
        ))
      }
    </div>
  );
};

export default observer(Gallery);
