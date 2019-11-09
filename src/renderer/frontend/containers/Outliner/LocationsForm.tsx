import React, { useContext, useCallback, useState } from 'react';
import StoreContext from '../../contexts/StoreContext';
import { Button, H4, Collapse, Icon } from '@blueprintjs/core';
import { remote } from 'electron';
import IconSet from '../../components/Icons';
import Path from 'path';

const LocationsForm = () => {

  const { watchedDirectoryStore } = useContext(StoreContext);

  const [isCollapsed, setCollapsed] = useState(false);

  const handleChooseWatchedDir = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    const dirs = remote.dialog.showOpenDialog({
      properties: ['openDirectory'],
    });

    // multi-selection is disabled which means there can be at most 1 folder
    if (!dirs || dirs.length === 0) {
      return;
    }
    watchedDirectoryStore.addDirectory({ path: dirs[0], recursive: true });
  }, []);

  const toggleLocations = useCallback(() => setCollapsed(!isCollapsed), [isCollapsed, setCollapsed]);

  return (
   <div>
      <div className="outliner-header-wrapper" onClick={toggleLocations}>
        <H4 className="bp3-heading">
          <Icon icon={isCollapsed ? 'caret-right' : 'caret-down'} />
          Locations
        </H4>
        <Button
          minimal
          icon={IconSet.ADD}
          onClick={handleChooseWatchedDir}
          className="tooltip"
          // data-right={DEFAULT_TAG_NAME}
        />
      </div>
      <Collapse isOpen={!isCollapsed}>
        <ul id="watched-folders">
          {
            watchedDirectoryStore.directoryList.map((dir, i) => (
              <li key={`${dir.path}-${i}`}>
                <span className="ellipsis-left" title={dir.path}>{Path.basename(dir.path)}</span>
                <Button icon="trash" />
              </li>
            ))
          }
        </ul>
      </Collapse>
    </div>
  );
};

export default LocationsForm;
