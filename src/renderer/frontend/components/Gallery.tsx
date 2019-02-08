import React from 'react';

import { observer } from 'mobx-react-lite';

import { withRootstore } from '../contexts/StoreContext';
import RootStore from '../stores/RootStore';
import GalleryItem from './GalleryItem';
import { ClientFile } from '../../entities/File';
import { ID } from '../../entities/ID';

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

  const addTagToFile = (file: ClientFile, tag: ID) => { file.addTag(tag); };

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
            onDrop={(item) => addTagToFile(file, item.id)}
          />
        ))
      }
    </div>
  );
};

export default withRootstore(observer(Gallery));
