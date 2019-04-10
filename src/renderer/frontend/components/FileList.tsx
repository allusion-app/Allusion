import React from 'react';
import { observer } from 'mobx-react-lite';

import { withRootstore, IRootStoreProp } from '../contexts/StoreContext';
import Gallery from './Gallery';
import FileSelectionHeader from './FileSelectionHeader';

export interface IFileListProps extends IRootStoreProp {}

const FileList = ({ rootStore: { uiStore, fileStore } }: IFileListProps) => {
  const removeSelectedFiles = async () => {
    await fileStore.removeFilesById(uiStore.fileSelection);
    uiStore.fileSelection.clear();
  };

  const selectionModeOn = uiStore.fileSelection.length > 0;

  return (
    <div className="gallery">
      { selectionModeOn && (
        <FileSelectionHeader
          numSelectedFiles={uiStore.fileSelection.length}
          onCancel={() => uiStore.fileSelection.clear()}
          onRemove={removeSelectedFiles}
        />
      )}

      <Gallery />
    </div>
  );
};

export default withRootstore(observer(FileList));
