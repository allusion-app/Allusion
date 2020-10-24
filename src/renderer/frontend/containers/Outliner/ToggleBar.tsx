import { Icon } from '@blueprintjs/core';
import { observer } from 'mobx-react-lite';
import React, { useContext } from 'react';
import { Slide } from '../../components/Transition';
import StoreContext from '../../contexts/StoreContext';

const isMac = process.platform === 'darwin';

// Maybe rename to NavToggle?
const ToggleBar = observer(() => {
  const { uiStore } = useContext(StoreContext);
  // TODO: Make this part of the outliner. But until then, just transition identically
  return (
    <>
      <Slide element="nav" id="outliner" open={uiStore.isOutlinerOpen}>
        <div id="togglebar"></div>
      </Slide>

      <Icon
        icon={uiStore.isOutlinerOpen ? 'double-chevron-left' : 'double-chevron-right'}
        onClick={uiStore.toggleOutliner}
        className={`togglebar-button ${isMac ? 'mac-toolbar' : undefined}`}
        iconSize={20}
      />
    </>
  );
});

export default ToggleBar;
