import React from 'react';
import { observer } from 'mobx-react-lite';

import { useStore } from 'src/frontend/contexts/StoreContext';
import { useFileDropper } from 'src/frontend/containers/Outliner/LocationsPanel/useFileDropper';
import LocationsTree from './LocationsTree';

const LocationsPanel = observer(() => {
  const { locationStore, uiStore } = useStore();

  const isEmpty = locationStore.locationList.length === 0;
  // Detect file dropping and show a blue outline around location panel
  const isDropping = useFileDropper(uiStore.openOutliner);

  return (
    <div
      className={`section ${isEmpty || isDropping ? 'attention' : ''} ${isDropping ? 'info' : ''}`}
    >
      <LocationsTree />
    </div>
  );
});

export default LocationsPanel;
