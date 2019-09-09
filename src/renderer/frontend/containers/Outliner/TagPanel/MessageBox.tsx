import { IRootStoreProp } from '../../../contexts/StoreContext';
import React, { useState, useEffect, useCallback } from 'react';
import { Tag, Alert, Classes } from '@blueprintjs/core';
import { observer } from 'mobx-react-lite';
import IconSet from '../../../components/Icons';
import { DragAndDropType } from '../TagPanel';
import { ClientTag } from '../../../../entities/Tag';
import { ClientTagCollection } from '../../../../entities/TagCollection';

const TagRemoverContent = ({
  rootStore: { uiStore, tagStore, tagCollectionStore },
}: IRootStoreProp) => {
  const [removeType, setRemoveType] = useState<DragAndDropType.Tag | DragAndDropType.Collection>();
  const [tagsToRemove, setTagsToRemove] = useState<ClientTag[]>([]);
  const [colToRemove, setColToRemove] = useState<ClientTagCollection>();

  useEffect(() => {
    // Check whether to remove selected tags or a specific tag or collection
    if (uiStore.isOutlinerTagRemoverOpen === 'selected') {
      setRemoveType(DragAndDropType.Tag);
      setTagsToRemove(uiStore.clientTagSelection);
    } else if (uiStore.isOutlinerTagRemoverOpen) {
      const id = uiStore.isOutlinerTagRemoverOpen;
      const remTag = tagStore.get(id);
      if (remTag) {
        setRemoveType(DragAndDropType.Tag);
        setTagsToRemove([remTag]);
      } else {
        const remCol = tagCollectionStore.get(id);
        if (remCol) {
          setRemoveType(DragAndDropType.Collection);
          setColToRemove(remCol);
          setTagsToRemove(remCol
            .getTagsRecursively()
            .map((t) => tagStore.get(t))
            .filter((t) => t !== undefined) as ClientTag[]);
        }
      }
    }
  }, []);

  const tagsToRemoveOverview = (
    <div id="tag-remove-overview">
      {tagsToRemove.map((tag) => (
        <span key={tag.id}>
          <Tag intent="primary">{tag.name}</Tag>{' '}
        </span>
      ))}
    </div>
  );

  if (removeType === DragAndDropType.Tag) {
    return (
      <>
        <h4 className="bp3-heading inpectorHeading">Confirm delete</h4>
        <p>
          Are you sure you want to permanently delete{' '}
          {tagsToRemove.length > 0 ? 'these tags' : 'this tag'}?
        </p>
        {tagsToRemoveOverview}
      </>
    );
  } else if (removeType === DragAndDropType.Collection && colToRemove) {
    return (
      <>
        <h4 className="bp3-heading inpectorHeading">Confirm delete</h4>
        <p>
          Are you sure you want to permanently delete the collection '{colToRemove.name}'?
          <br />
          {tagsToRemove.length > 0 && 'It contains these tags:'}
        </p>
        {tagsToRemoveOverview}
      </>
    );
  }
  return <span>...</span>;
};

export const TagRemoval = observer(({ rootStore }: IRootStoreProp) => {
  const { uiStore, tagStore, tagCollectionStore } = rootStore;

  const handleConfirm = useCallback(
    async () => {
      if (uiStore.isOutlinerTagRemoverOpen === 'selected') {
        await uiStore.removeSelectedTagsAndCollections();
      } else if (uiStore.isOutlinerTagRemoverOpen) {
        const id = uiStore.isOutlinerTagRemoverOpen;
        const remTag = tagStore.get(id);
        if (remTag) {
          await remTag.delete();
        } else {
          const remCol = tagCollectionStore.get(id);
          if (remCol) {
            await remCol.delete();
          }
        }
      }
      uiStore.closeOutlinerTagRemover();
    },
    [uiStore.isOutlinerTagRemoverOpen],
  );

  return (
    <Alert
      isOpen={uiStore.isOutlinerTagRemoverOpen !== null}
      cancelButtonText="Cancel"
      confirmButtonText="Delete"
      icon={IconSet.DELETE}
      intent="danger"
      onCancel={uiStore.closeOutlinerTagRemover}
      canEscapeKeyCancel
      canOutsideClickCancel
      onConfirm={handleConfirm}
      className={Classes.DARK}
    >
      <TagRemoverContent rootStore={rootStore} />
    </Alert>
  );
});
