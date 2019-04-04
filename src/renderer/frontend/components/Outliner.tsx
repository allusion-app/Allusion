import React, { useContext } from 'react';
import TagList from './TagList';
import StoreContext from '../contexts/StoreContext';
import { observer } from 'mobx-react-lite';

const Outliner = () => {
  const { uiStore } = useContext(StoreContext);
  return (
    <nav className={uiStore.isOutlinerOpen ? 'outlinerOpen' : ''}>
      <h4 className="bp3-heading">All tags</h4>
      <TagList />
    </nav>
  );
};

export default observer(Outliner);
