import React, { useContext } from 'react';
import { observer } from 'mobx-react-lite';

import StoreContext from '../../contexts/StoreContext';

import TagsPanel from './TagsPanel';
import LocationsPanel from './LocationsPanel';

const Outliner = () => {
  const rootStore = useContext(StoreContext);
  const { uiStore } = rootStore;

  // Todo: Use https://blueprintjs.com/docs/#core/components/tabs
  return (
    <nav id="outliner" className={`${uiStore.isOutlinerOpen ? 'outlinerOpen' : ''}`}>
      <LocationsPanel />
      <TagsPanel />
    </nav>
  );
};

export default observer(Outliner);
