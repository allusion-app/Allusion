import React, { useContext } from 'react';
import { observer } from 'mobx-react-lite';
import { H4 } from '@blueprintjs/core';

import StoreContext from '../contexts/StoreContext';

import TagList from './TagTree';
import ImportForm from './ImportForm';
import SearchForm from './SearchForm';

const Outliner = () => {
  const { uiStore } = useContext(StoreContext);

  // Todo: Use https://blueprintjs.com/docs/#core/components/tabs
  return (
    <nav className={`${uiStore.isOutlinerOpen ? 'outlinerOpen' : ''}`}>
      {uiStore.outlinerPage === 'IMPORT' && (<>
        <H4 className="bp3-heading">Import</H4>
        <ImportForm />
      </>)}

      {uiStore.outlinerPage === 'TAGS' && (<TagList />)}

      {uiStore.outlinerPage === 'SEARCH' && (<>
        <H4 className="bp3-heading">Search</H4>
        <SearchForm />
      </>)}
    </nav>
  );
};

export default observer(Outliner);
