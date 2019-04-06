import React, { useCallback, useState, useMemo, useEffect } from 'react';
import { Tree, ITreeNode } from '@blueprintjs/core';
import { observer } from 'mobx-react-lite';
import { useContext } from 'react';

import os from 'os';
import path from 'path';

import StoreContext from '../contexts/StoreContext';

const platform = os.platform();
const homeDir = os.homedir();

const systemDirs = {
  pictures: 'Pictures',
  documents: 'Documents',
  downloads: 'Downloads',
  videos: 'Videos',
};

// We can add exceptions here if platforms behave differently
// Other option, use dependency: Platform agnostic user directories
// https://www.npmjs.com/package/platform-folders
if (platform === 'win32') { // Windows
} else if (platform === 'darwin') { // Mac
} else if (platform === 'linux') { // Linix
} else {
  console.error('Platform unsupported', platform);
}

const LocationsTree = () => {
  // Todo: Add Location entity to DB, so we can have user-picked directories as well
  // Todo: Also show sub-directories in tree

  const { fileStore } = useContext(StoreContext);

  const [activeLocation, setActiveLocation] = useState<string | undefined>(undefined);

  const treeContents = useMemo(
    () => Object.values(systemDirs)
      .map((dir): ITreeNode => ({
        id: dir,
        label: dir,
        isSelected: activeLocation === dir,
      }),
    ),
    [activeLocation],
  );

  const handleNodeClick = useCallback(
    (node: ITreeNode) => {
      setActiveLocation(`${node.id}`);
      fileStore.loadLocation(path.join(homeDir, `${node.id}`));
    },
    [],
  );

  // Select the first directory when this component mounts
  useEffect(() => handleNodeClick(treeContents[0]), []);

  return (
    <Tree
      contents={treeContents}
      onNodeClick={handleNodeClick}
    />
  );
};

export default observer(LocationsTree);
