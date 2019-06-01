import React, { useCallback } from 'react';
import { observer } from 'mobx-react-lite';

import { withRootstore, IRootStoreProp } from '../contexts/StoreContext';
import Gallery from './Gallery';
import { Tag, ITagProps, Button } from '@blueprintjs/core';
import IconSet from './Icons';
import { ITagSearchQuery } from '../stores/UiStore';
import { ClientTag } from '../../entities/Tag';

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

  return (
    <div className="gallery">

      <div id="query-overview">
        {uiStore.searchQueryList
          .flatMap((q) => (q as ITagSearchQuery).value)
          .map((tagId) => (
            <Tag
              key={tagId}
              id={tagId}
              intent="primary"
              onRemove={handleDeselectTag}
            >
              {(tagStore.tagList.find((t) => t.id === tagId) as ClientTag).name}
            </Tag>),
          )
        }
        {uiStore.clientTagSelection.length > 0 && (
          <Button
            icon={IconSet.CLOSE}
            onClick={handleClearIncludedTags}
            className="bp3-minimal"
          />
        )}
      </div>
      <Gallery />
    </div>
  );
};

export default withRootstore(observer(FileList));
