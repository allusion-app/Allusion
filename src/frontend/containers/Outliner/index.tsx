import { observer } from 'mobx-react-lite';
import React, { useState } from 'react';
import MultiSplit from 'widgets/MultiSplit';

import { useStore } from '../../contexts/StoreContext';
import LocationsPanel from './LocationsPanel';
import SavedSearchesPanel from './SavedSearchesPanel';
import TagsPanel, { OutlinerActionBar } from './TagsPanel';

const Outliner = () => {
  const { uiStore } = useStore();

  // TODO: Store values in UI store
  const [expansion, setExpansion] = useState([true, true, true]);

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
