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
    <nav id="outliner" className={isOpen ? '' : 'outliner-is-closed'}>
      {/* Note: We could hide children for performance, but the expand/collapse state is lost, so keeping it around for now */}
      {/* {isOpen ? children : null} */}
      {children}
    </nav>
  );
};
