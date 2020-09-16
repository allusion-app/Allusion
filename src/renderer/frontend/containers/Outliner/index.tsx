import { observer } from 'mobx-react-lite';
import React, { useContext } from 'react';
import { CSSTransition } from 'react-transition-group';
import StoreContext from '../../contexts/StoreContext';
import LocationsPanel from './LocationsPanel';
import TagsPanel, { SystemTags } from './TagsPanel';

const Outliner = () => {
  const { uiStore } = useContext(StoreContext);

  // Todo: Use https://blueprintjs.com/docs/#core/components/tabs
  return (
    // Note: timeout needs to equal the transition time in CSS
    <CSSTransition
      in={uiStore.isOutlinerOpen}
      classNames="sliding-sidebar"
      timeout={200}
      unmountOnExit
    >
      <nav id="outliner">
        <div id="outliner-content">
          <LocationsPanel />
          <TagsPanel />
        </div>
        <SystemTags />
      </nav>
    </CSSTransition>
  );
};

export default observer(Outliner);
