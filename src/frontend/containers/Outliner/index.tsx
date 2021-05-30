import { observer } from 'mobx-react-lite';
import React from 'react';

import { useStore } from '../../contexts/StoreContext';
import ActionBar from './ActionBar';
import LocationsPanel from './LocationsPanel';
import TagsPanel from './TagsPanel';

export const HOVER_TIME_TO_EXPAND = 600;

const Outliner = () => {
  const { uiStore } = useStore();

  return (
    <nav id="outliner" aria-expanded={uiStore.preferences.isOutlinerOpen}>
      <div id="outliner-content">
        <LocationsPanel />
        <TagsPanel />
      </div>
      <ActionBar />
    </nav>
  );
};

export default observer(Outliner);
