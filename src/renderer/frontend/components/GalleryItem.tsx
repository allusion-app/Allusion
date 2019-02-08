import React from 'react';

import { observer } from 'mobx-react-lite';

import { ClientFile } from '../../entities/File';

interface IGalleryItemProps {
  file: ClientFile;
  isSelected: boolean;
  onSelect: (file: ClientFile) => void;
  onDeselect: (file: ClientFile) => void;
}
const GalleryItem = ({
  file,
  isSelected,
  onSelect,
  onDeselect,
}: IGalleryItemProps) => {
  return (
    <div
      className={`thumbnail ${isSelected ? 'selected' : ''}`}
      onClick={() => isSelected ? onDeselect(file) : onSelect(file)}
    >
      <img
        key={`file-${file.id}`}
        src={file.path}
      />
    </div>
  );
};

export default observer(GalleryItem);
