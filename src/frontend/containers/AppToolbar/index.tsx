import React, { useContext } from 'react';
import { observer } from 'mobx-react-lite';

import StoreContext from '../../contexts/StoreContext';

import { Toolbar } from 'widgets/menus';

import PrimaryCommands, { SlideModeCommand } from './PrimaryCommands';
import SecondaryCommands from './SecondaryCommands';

/**
 * The top-level app toolbar
 */
const AppToolbar = observer(() => {
  const { uiStore, fileStore } = useContext(StoreContext);

  return (
    <Toolbar id="toolbar" label="App Toolbar" controls="layout-container">
      {/* Primary Commands depending on current mode */}
      {uiStore.isSlideMode ? (
        <SlideModeCommand uiStore={uiStore} />
      ) : (
        <PrimaryCommands uiStore={uiStore} fileStore={fileStore} />
      )}

      {/* Overflow Menu */}
      <SecondaryCommands uiStore={uiStore} />

      {/* Enables resizing when the window title bar is hidden */}
      <div id="window-resize-area" />
    </Toolbar>
  );
});

export default AppToolbar;
