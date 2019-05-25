import React, { useCallback } from 'react';
import { observer } from 'mobx-react-lite';

import { withRootstore, IRootStoreProp } from '../contexts/StoreContext';
import Gallery from './Gallery';
import { Tag, ITagProps, Button } from '@blueprintjs/core';
import IconSet from './Icons';

export interface IFileListProps extends IRootStoreProp { }

const FileList = ({ rootStore: { uiStore, fileStore, tagStore } }: IFileListProps) => {

  const handleClearIncludedTags = useCallback(() => uiStore.clearTagSelection(), []);

  const handleDeselectTag = useCallback(
    (_, props: ITagProps) => {
      const clickedTag = tagStore.tagList.find((t) => t.id === props.id);
      if (clickedTag) {
        uiStore.deselectTag(clickedTag);
      }
    },
    [],
  );
  // Dirty show /hide
  const hide = 'none';
  const hideBtn = uiStore.clientTagSelection.length ? '' : hide;
  return (
    <div className="gallery">

      <div id="query-overview">
        {uiStore.clientTagSelection.map((tag) => (
          <Tag
            key={tag.id}
            id={tag.id}
            intent="primary"
            onRemove={handleDeselectTag}
          >
            {tag.name}
          </Tag>),
        )}
      <Button icon={IconSet.CLOSE} onClick={handleClearIncludedTags} className="bp3-minimal" style={{ display: hideBtn }} />{/* // tslint:disable-next-line */}
      </div>
      <Gallery />
    </div>
  );
};

export default withRootstore(observer(FileList));
