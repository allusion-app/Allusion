import React from 'react';
import { observer } from 'mobx-react-lite';

import { useStore } from '../../contexts/StoreContext';

import { Toolbar } from 'widgets/menus';

import PrimaryCommands, { SlideModeCommand } from './PrimaryCommands';
import SecondaryCommands from './SecondaryCommands';

/**
 * The top-level app toolbar
 */
const AppToolbar = observer(() => {
  const { uiStore } = useStore();

  return (
    <Toolbar id="toolbar" label="App Toolbar" controls="layout-container">
      {/* Primary Commands depending on current mode */}
      {uiStore.isSlideMode ? <SlideModeCommand /> : <PrimaryCommands />}

      {/* Overflow Menu */}
      <SecondaryCommands />
    </Toolbar>
  );
});

export default AppToolbar;
