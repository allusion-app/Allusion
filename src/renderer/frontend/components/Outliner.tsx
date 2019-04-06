import React, { useContext } from 'react';
import TagList from './TagList';
import StoreContext from '../contexts/StoreContext';
import { observer } from 'mobx-react-lite';
import LocationsTree from './LocationsTree';
import SearchForm from './SearchForm';

const Outliner = () => {
  const { uiStore } = useContext(StoreContext);

  return (
    <nav className={'outlinerOpen'}>
      {uiStore.outlinerPage === 'LOCATIONS' && (<>
        <h4 className="bp3-heading">Locations</h4>
        <LocationsTree />
      </>)}

      {uiStore.outlinerPage === 'TAGS' && (<>
        <h4 className="bp3-heading">Tags</h4>
        <TagList />
      </>)}

      {uiStore.outlinerPage === 'SEARCH' && (<>
        <h4 className="bp3-heading">Search</h4>
        <SearchForm />
      </>)}
    </nav>
  );
};

export default observer(Outliner);
