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
  const handleDeselectTag = useCallback(
    (_, props: ITagProps) => {
      const clickedTag = tagStore.tagList.find((t) => t.id === props.id);
      if (clickedTag) {
        uiStore.deselectTag(clickedTag);
      }
    },
    [],
  );

  // Todo: Implement this properly later
  const queriedTags = uiStore.searchQueryList
    .flatMap((q) => (q as ITagSearchQuery).value);

  return (
    <div className="gallery">

      <div id="query-overview">
        {
          queriedTags.map((tagId) => (
            <Tag
              key={tagId}
              id={tagId}
              intent="primary"
              onRemove={handleDeselectTag}
            >
              {(tagStore.tagList.find((t) => t.id === tagId) as ClientTag).name}
            </Tag>
          ))
        }
        {queriedTags.length > 0 && (
          <Button
            icon={IconSet.CLOSE}
            onClick={uiStore.clearSearchQueryList}
            className="bp3-minimal"
          />
        )}
      </div>
      <Gallery />
    </div>
  );
};

export default withRootstore(observer(FileList));
