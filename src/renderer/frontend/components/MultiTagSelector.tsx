import React, { useContext, useMemo } from 'react';
import { observer } from 'mobx-react-lite';

import { ClientTag } from '../../entities/Tag';
import StoreContext from '../contexts/StoreContext';
import { MultiAutoComplete, IMultiAutoComplete } from 'components';
import { ClientTagCollection, ROOT_TAG_COLLECTION_ID } from '../../entities/TagCollection';

type IMultiTagSelector = Omit<IMultiAutoComplete<ClientTag>, 'items' | 'tagColor'>;

const getColor = (t: ClientTag) => t.viewColor;

const MultiTagSelector = observer(
  ({
    selection,
    onSelect,
    onDeselect,
    onClear,
    onCreate,
    tagLabel = (t) => t.name,
    disabled,
  }: IMultiTagSelector) => {
    const { tagStore } = useContext(StoreContext);
    return (
      <MultiAutoComplete
        disabled={disabled}
        selection={selection}
        items={tagStore.tagList}
        onSelect={onSelect}
        onDeselect={onDeselect}
        onClear={onClear}
        onCreate={onCreate}
        tagLabel={tagLabel}
        tagColor={getColor}
      />
    );
  },
);

type TagItem = ClientTag | ClientTagCollection;

type IMultiTagColSelector = Omit<IMultiAutoComplete<TagItem>, 'items' | 'tagColor'>;

const MultiTagColSelector = observer(
  ({
    selection,
    onSelect,
    onDeselect,
    onClear,
    onCreate,
    tagLabel = (t) => t.name,
    disabled,
  }: IMultiTagColSelector) => {
    const {
      tagStore: { tagList },
      tagCollectionStore: { tagCollectionList },
    } = useContext(StoreContext);

    const items = useMemo(() => {
      const rootIndex = tagCollectionList.findIndex((c) => c.id === ROOT_TAG_COLLECTION_ID);
      const collections = tagCollectionList;
      return (collections
        .slice(0, rootIndex)
        .concat(collections.slice(rootIndex + 1)) as TagItem[]).concat(tagList);
    }, [tagCollectionList, tagList]);

    return (
      <MultiAutoComplete
        disabled={disabled}
        selection={selection}
        items={items}
        onSelect={onSelect}
        onDeselect={onDeselect}
        onClear={onClear}
        onCreate={onCreate}
        tagLabel={tagLabel}
        tagColor={getColor}
      />
    );
  },
);

export { MultiTagSelector, MultiTagColSelector };
