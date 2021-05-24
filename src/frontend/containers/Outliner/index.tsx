import { observer } from 'mobx-react-lite';
import React, { useContext } from 'react';

import StoreContext from '../../contexts/StoreContext';
import LocationsPanel from './LocationsPanel';
import TagsPanel, { OutlinerActionBar } from './TagsPanel';

const Outliner = () => {
  const { uiStore } = useContext(StoreContext);

  return (
    <nav id="outliner" aria-expanded={uiStore.preferences.isOutlinerOpen}>
      <div id="outliner-content">
        <LocationsPanel />
        <TagsPanel />
      </div>
      <OutlinerActionBar />
    </nav>
  );
};

export default observer(Outliner);
