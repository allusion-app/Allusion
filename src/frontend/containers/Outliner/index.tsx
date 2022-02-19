import { observer } from 'mobx-react-lite';
import React, { useState } from 'react';
import MultiSplit from 'widgets/Split/MultiSplit';

import { useStore } from '../../contexts/StoreContext';
import LocationsPanel from './LocationsPanel';
import SavedSearchesPanel from './SavedSearchesPanel';
import TagsPanel, { OutlinerActionBar } from './TagsPanel';

const Outliner = () => {
  const { uiStore } = useStore();

  // TODO: Store values in UI store
  const [splitPoints, setSplitPoints] = useState([300, 600]);
  const [expansion, setExpansion] = useState([true, true, true]);

  return (
    <nav id="outliner" aria-expanded={uiStore.isOutlinerOpen}>
      <div id="outliner-content">
        <MultiSplit
          axis="horizontal"
          splitPoints={splitPoints}
          onChange={(splitPoints, expansion) => {
            setSplitPoints(splitPoints);
            setExpansion(expansion);
          }}
          expansion={expansion}
        >
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
