import React, { useContext } from 'react';
import TagList from './TagList';
import StoreContext from '../contexts/StoreContext';
import { observer } from 'mobx-react-lite';
import MultiTagSelector from './MultiTagSelector';
import { Tree } from '@blueprintjs/core';

const Outliner = () => {
  const { uiStore } = useContext(StoreContext);

  return (
    <nav className={'outlinerOpen'}>
      {uiStore.outlinerPage === 'LOCATIONS' && (<>
        <h4 className="bp3-heading">Locations</h4>
        <Tree
          contents={[{ id: 'root', label: 'My Pictures', hasCaret: true }]}
        />
      </>)}

      {uiStore.outlinerPage === 'TAGS' && (<>
        <h4 className="bp3-heading">Tags</h4>
        <TagList />
      </>)}

      {uiStore.outlinerPage === 'SEARCH' && (<>
        <h4 className="bp3-heading">Search</h4>
        <MultiTagSelector
          selectedTags={[]}
          onTagSelect={() => console.log('select')}
          onTagDeselect={() => console.log('deselect')}
          onClearSelection={() => console.log('clear')}
        />
      </>)}
    </nav>
  );
};

export default observer(Outliner);
