import { observer } from 'mobx-react-lite';
import React from 'react';

import { useStore } from '../../contexts/StoreContext';
import LocationsPanel from './LocationsPanel';
import TagsPanel, { OutlinerActionBar } from './TagsPanel';

const Outliner = () => {
  const { uiStore } = useStore();

  return (
    <nav id="outliner" aria-expanded={uiStore.isOutlinerOpen}>
      <div id="outliner-content">
        <LocationsPanel />
        <TagsPanel />
      </div>
      <OutlinerActionBar />
    </nav>
  );
};

export default observer(Outliner);
