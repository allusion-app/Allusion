import { observer } from 'mobx-react-lite';
import React, { useState } from 'react';
import useLocalStorage from 'src/frontend/hooks/useLocalStorage';
import MultiSplit from 'widgets/MultiSplit';

import { useStore } from '../../contexts/StoreContext';
import LocationsPanel from './LocationsPanel';
import SavedSearchesPanel from './SavedSearchesPanel';
import TagsPanel, { OutlinerActionBar } from './TagsPanel';

const Outliner = () => {
  const { uiStore } = useStore();

  // Would be more consistent to store these in the UIStore,
  // but that would only be needed when the values need to be changed from other places
  const [expansion, setExpansion] = useLocalStorage('outliner-expansion', [true, true, true]);
  const [splitPoints, setSplitPoints] = useLocalStorage('outliner-split-points', [0, 0]);

  return (
    <nav id="outliner" aria-expanded={uiStore.isOutlinerOpen}>
      <div id="outliner-content">
        <MultiSplit onUpdateExpansion={setExpansion} expansion={expansion}>
          <LocationsPanel />
          <TagsPanel />
          <SavedSearchesPanel />
        </MultiSplit>
      </div>
      <OutlinerActionBar />
    </nav>
  );
};

export default observer(Outliner);
