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

  return (
    <div>
      {
        fileList.map((file) => (
          <GalleryItem
            key={`file-${file.id}`}
            file={file}
            isSelected={uiStore.fileSelection.includes(file.id)}
            onRemoveTag={(t) => file.removeTag(t.id)}
            onSelect={(f) => uiStore.selectFile(f)}
            onDeselect={(f) => uiStore.deselectFile(f)}
            onDrop={(item) => file.addTag(item.id)}
          />
        ))
      }
    </div>
  );
};

export default withRootstore(observer(Gallery));
