import React, { useContext, useState, useRef } from 'react';
import { observer } from 'mobx-react-lite';
import { flow } from 'mobx';

import { RendererMessenger } from 'src/Messaging';
import { useStore } from 'src/frontend/contexts/StoreContext';
import useContextMenu from 'src/frontend/hooks/useContextMenu';
import { ClientLocation } from 'src/entities/Location';
import { IconSet } from 'widgets';
import { Toolbar, ToolbarButton, Menu, ContextMenu } from 'widgets/menus';
import LocationRecoveryDialog from './LocationRecoveryDialog';
import { LocationRemoval } from 'src/frontend/components/RemovalAlert';
import { Collapse } from 'src/frontend/components/Collapse';
import { AppToaster } from 'src/frontend/components/Toaster';
import DropContext from 'src/frontend/contexts/DropContext';
import LocationsTree from './LocationsTree';

// Tooltip info
const enum Tooltip {
  Location = 'Add new Location',
  Refresh = 'Refresh directories',
}

const LocationsPanel = observer(() => {
  const { locationStore } = useStore();
  const [contextState, { show, hide }] = useContextMenu();

  const [deletableLocation, setDeletableLocation] = useState<ClientLocation | undefined>(undefined);
  const [isCollapsed, setCollapsed] = useState(false);
  const [reloadLocationHierarchyTrigger, setReloadLocationHierarchyTrigger] = useState(new Date());

  // TODO: Offer option to replace child location(s) with the parent loc, so no data of imported images is lost
  const handleChooseWatchedDir = useRef(
    flow(function* () {
      let path: string;
      try {
        const { filePaths }: { filePaths: string[] } = yield RendererMessenger.openDialog({
          properties: ['openDirectory'],
        });
        // multi-selection is disabled which means there can be at most 1 folder
        if (filePaths.length === 0) {
          return;
        }
        path = filePaths[0];
      } catch (error) {
        // TODO: Show error notification.
        console.error(error);
        return;
      }

      if (path === undefined) {
        return;
      }

      // Check if the new location is a sub-directory of an existing location
      const parentDir = locationStore.locationList.some((dir) => path.includes(dir.path));
      if (parentDir) {
        AppToaster.show({
          message: 'You cannot add a location that is a sub-folder of an existing location.',
          timeout: 5000,
        });
        return;
      }

      // Check if the new location is a parent-directory of an existing location
      const childDir = locationStore.locationList.some((dir) => dir.path.includes(path));
      if (childDir) {
        AppToaster.show({
          message: 'You cannot add a location that is a parent-folder of an existing location.',
          timeout: 5000,
        });
        return;
      }

      const location: ClientLocation = yield locationStore.create(path);
      yield locationStore.initLocation(location);
    }),
  );

  const isEmpty = locationStore.locationList.length === 0;
  // Detect file dropping and show a blue outline around location panel
  const { isDropping } = useContext(DropContext);

  return (
    <div
      className={`section ${isEmpty || isDropping ? 'attention' : ''} ${isDropping ? 'info' : ''}`}
    >
      <header>
        <h2 onClick={() => setCollapsed(!isCollapsed)}>Locations</h2>
        <Toolbar controls="location-list">
          {locationStore.locationList.length > 0 && (
            <ToolbarButton
              showLabel="never"
              icon={IconSet.RELOAD}
              text="Refresh"
              onClick={() => setReloadLocationHierarchyTrigger(new Date())}
              tooltip={Tooltip.Refresh}
            />
          )}
          <ToolbarButton
            showLabel="never"
            icon={IconSet.PLUS}
            text="New Location"
            onClick={handleChooseWatchedDir.current}
            tooltip={Tooltip.Location}
          />
        </Toolbar>
      </header>
      <Collapse open={!isCollapsed}>
        <LocationsTree
          showContextMenu={show}
          onDelete={setDeletableLocation}
          reloadLocationHierarchyTrigger={reloadLocationHierarchyTrigger}
        />
        {isEmpty && <i>Click + to choose a Location</i>}
      </Collapse>
      <LocationRecoveryDialog />
      {deletableLocation && (
        <LocationRemoval
          object={deletableLocation}
          onClose={() => setDeletableLocation(undefined)}
        />
      )}
      <ContextMenu
        isOpen={contextState.open}
        x={contextState.x}
        y={contextState.y}
        close={hide}
        usePortal
      >
        <Menu>{contextState.menu}</Menu>
      </ContextMenu>
    </div>
  );
});

export default LocationsPanel;
