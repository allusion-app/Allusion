import { observer } from 'mobx-react-lite';
import React, { useContext } from 'react';
import StoreContext from '../../contexts/StoreContext';
import LocationsPanel from './LocationsPanel';
import TagsPanel, { SystemTags } from './TagsPanel';
import { Slide } from '../../components/Transition';

const Outliner = () => {
  const { uiStore } = useContext(StoreContext);

  // Todo: Use https://blueprintjs.com/docs/#core/components/tabs
  return (
    <Slide element="nav" id="outliner" open={uiStore.isOutlinerOpen} unmountOnExit>
      <div id="outliner-content">
        <LocationsPanel />
        <TagsPanel />
      </div>
      <SystemTags />
    </Slide>
  );
};

export default observer(Outliner);
