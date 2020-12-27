import { observer } from 'mobx-react-lite';
import React, { useContext } from 'react';

import StoreContext from '../../contexts/StoreContext';
import LocationsPanel from './LocationsPanel';
import TagsPanel, { OutlinerActionBar } from './TagsPanel';

const Outliner = () => {
  const { uiStore } = useContext(StoreContext);

  return (
    <Panel isOpen={uiStore.isOutlinerOpen}>
      <div id="outliner-content">
        <LocationsPanel />
        <TagsPanel />
      </div>
      <OutlinerActionBar />
    </Panel>
  );
};

export default observer(Outliner);

const Panel = ({ isOpen, children }: { isOpen: boolean; children: React.ReactNode }) => {
  return (
    <nav id="outliner" style={isOpen ? undefined : { width: '0' }}>
      {isOpen ? children : null}
    </nav>
  );
};
