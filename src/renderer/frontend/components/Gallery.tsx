import React from 'react';

import { observer } from 'mobx-react-lite';
import { ClientFile } from '../../entities/File';

interface IGalleryProps {
  files: ClientFile[];
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
