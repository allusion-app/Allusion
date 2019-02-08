import React from 'react';

import { observer } from 'mobx-react-lite';

import { withRootstore } from '../contexts/StoreContext';
import RootStore from '../stores/RootStore';
import GalleryItem from './GalleryItem';

interface IGalleryProps {
  rootStore: RootStore;
}

const Gallery = ({
  rootStore: {
    uiStore,
    fileStore: {
      fileList,
    },
  },
}: IGalleryProps) => {

  return (
    <div>
      {
        fileList.map((file) => (
          <GalleryItem
            key={`file-${file.id}`}
            file={file}
            isSelected={uiStore.fileSelection.includes(file.id)}
            onSelect={(f) => uiStore.selectFile(f)}
            onDeselect={(f) => uiStore.deselectFile(f)}
          />
        ))
      }
    </div>
  );
};

export default withRootstore(observer(Gallery));
