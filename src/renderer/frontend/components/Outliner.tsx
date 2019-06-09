import React, { useContext, useCallback } from 'react';
import { observer } from 'mobx-react-lite';
import { H4, Button } from '@blueprintjs/core';

import StoreContext from '../contexts/StoreContext';

import TagList from './TagTree';
import ImportForm from './ImportForm';
import SearchForm from './SearchForm';
import IconSet from './Icons';
import { DEFAULT_TAG_NAME } from './TagListItem';
import { DEFAULT_COLLECTION_NAME } from './TagCollectionListItem';

const Outliner = () => {
  const { uiStore, tagStore, tagCollectionStore } = useContext(StoreContext);

  const handleAddTag = useCallback(() => {
    tagStore.addTag(DEFAULT_TAG_NAME)
      .then((tag) => tagCollectionStore.getRootCollection().addTag(tag.id))
      .catch((err) => console.log('Could not create tag', err));
  }, []);
  const handleAddCollection = useCallback(async () => {
    await tagCollectionStore.addTagCollection(DEFAULT_COLLECTION_NAME, tagCollectionStore.getRootCollection());
  }, []);

  // Todo: Use https://blueprintjs.com/docs/#core/components/tabs
  return (
    <nav className={`${uiStore.isOutlinerOpen ? 'outlinerOpen' : ''}`}>
      {uiStore.outlinerPage === 'IMPORT' && (<>
        <H4 className="bp3-heading">Import</H4>
        <ImportForm />
      </>)}

      {uiStore.outlinerPage === 'TAGS' && (<>
        <div id="outliner-tags-header-wrapper">
          <H4 className="bp3-heading">Tags</H4>
          <Button minimal icon={IconSet.TAG_ADD} onClick={handleAddTag}/>
          <Button minimal icon={IconSet.COLLECTION_ADD} onClick={handleAddCollection} />

        </div>
        <TagList />
      </>)}

      {uiStore.outlinerPage === 'SEARCH' && (<>
        <H4 className="bp3-heading">Search</H4>
        <SearchForm />
      </>)}
    </nav>
  );
};

export default observer(Outliner);
