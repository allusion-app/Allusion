import React, { useCallback } from 'react';
import { observer } from 'mobx-react-lite';
import { Tag, ITagProps, Button, Hotkey, Hotkeys, HotkeysTarget } from '@blueprintjs/core';

import StoreContext, { IRootStoreProp } from '../contexts/StoreContext';
import Gallery from './Gallery';
import IconSet from './Icons';
import { ITagSearchQuery } from '../stores/UiStore';
import { ClientTag } from '../../entities/Tag';

export interface IFileListProps { }

const FileList = ({ rootStore: { uiStore, tagStore } }: IFileListProps & IRootStoreProp) => {
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
  const queriedTags = Array.from(
    new Set(uiStore.searchQueryList
      .flatMap((q) => (q as ITagSearchQuery).value),
    ),
  );

  return (
    <>
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
    </>
  );
};

@HotkeysTarget
class FileListWithHotkeys extends React.PureComponent<IFileListProps & IRootStoreProp, {}> {
  render() {
    return <div tabIndex={1} className="gallery"><FileList {...this.props} /></div>;
  }
  renderHotkeys() {
    const { uiStore } = this.props.rootStore;
    const { hotkeyMap } = uiStore;
    return (
      <Hotkeys>
        <Hotkey
          combo={hotkeyMap.selectAll}
          label="Select all files in the content area"
          onKeyDown={uiStore.selectAllFiles}
          group="Gallery"
        />
        <Hotkey
          combo={hotkeyMap.deselectAll}
          label="Deselect all files in the content area"
          onKeyDown={uiStore.deselectAllFiles}
          group="Gallery"
        />
        <Hotkey
          combo={hotkeyMap.deleteSelection}
          label="Delete the selected files"
          onKeyDown={uiStore.toggleToolbarFileRemover}
          group="Gallery"
        />
      </Hotkeys>
    );
  }
}

const HotkeysWrapper = observer((props: IFileListProps & IRootStoreProp) => {
  const rootStore = React.useContext(StoreContext);
  return <FileListWithHotkeys {...props} rootStore={rootStore} />;
});

export default HotkeysWrapper;
