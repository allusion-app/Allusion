import React from 'react';

import { observer } from 'mobx-react-lite';

import { withRootstore, IRootStoreProp } from '../contexts/StoreContext';
import GalleryItem from './GalleryItem';
import { ClientFile } from '../../entities/File';
import { ClientTag } from '../../entities/Tag';

interface IGalleryProps extends IRootStoreProp { }

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
            onRemoveTag={(tag: ClientTag) => file.removeTag(tag.id)}
            onSelect={(f: ClientFile) => uiStore.selectFile(f)}
            onOpen={(f) => console.log('Open file ', f)}
            onDeselect={(f: ClientFile) => uiStore.deselectFile(f)}
            onDrop={(tag: ClientTag) => file.addTag(tag.id)}
          />
        ))
      }
    </div>
  );
};

export default withRootstore(observer(Gallery));
