import React, { useCallback } from 'react';
import { observer } from 'mobx-react-lite';

import { withRootstore, IRootStoreProp } from '../contexts/StoreContext';
import Gallery from './Gallery';
import FileSelectionHeader from './FileSelectionHeader';
import { Tag, ITagProps } from '@blueprintjs/core';

export interface IFileListProps extends IRootStoreProp {}

const FileList = ({ rootStore: { uiStore, fileStore, tagStore } }: IFileListProps) => {

  const handleClearFileSelection = useCallback(
    () => uiStore.fileSelection.clear(),
    [],
  );

  const removeSelectedFiles = useCallback(
    async () => {
      await fileStore.removeFilesById(uiStore.fileSelection);
      uiStore.fileSelection.clear();
    },
    [],
  );

  const handleDeselectTag = useCallback(
    (_, props: ITagProps) => {
      const clickedTag = tagStore.tagList.find((t) => t.id === props.id);
      if (clickedTag) {
        uiStore.deselectTag(clickedTag);
      }
    },
    [],
  );

  const selectionModeOn = uiStore.fileSelection.length > 0;

  return (
    <div className="gallery">
      { selectionModeOn && (
        <FileSelectionHeader
          numSelectedFiles={uiStore.fileSelection.length}
          onCancel={handleClearFileSelection}
          onRemove={removeSelectedFiles}
        />
      )}

      <div id="query-overview">
        { uiStore.clientTagSelection.map((tag) => (
          <Tag
            key={tag.id}
            id={tag.id}
            intent="primary"
            onRemove={handleDeselectTag}
          >
            {tag.name}
          </Tag>),
        )}
      </div>

      <Gallery />
    </div>
  );
};

export default withRootstore(observer(FileList));
