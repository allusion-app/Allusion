import { observer } from 'mobx-react-lite';
import React, { useContext } from 'react';
import StoreContext from '../../contexts/StoreContext';
import LocationsPanel from './LocationsPanel';
import TagsPanel, { OutlinerActionBar } from './TagsPanel';
import { Slide } from '../../components/Transition';

const Outliner = () => {
  const { uiStore } = useContext(StoreContext);

  return (
    <Slide element="nav" id="outliner" open={uiStore.isOutlinerOpen} unmountOnExit>
      <div id="outliner-content">
        <LocationsPanel />
        <TagsPanel />
      </div>
      <OutlinerActionBar />
    </Slide>
  );
};

export default observer(Outliner);
