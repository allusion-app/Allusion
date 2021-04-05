import React, { useCallback, useContext } from 'react';
import { observer } from 'mobx-react-lite';

import StoreContext from '../../contexts/StoreContext';
import FileTags from '../../components/FileTag';
import ImageInfo from '../../components/ImageInfo';
import { IconButton, IconSet } from 'widgets';
import { shell } from 'electron';

const Inspector = observer(() => {
  const { uiStore } = useContext(StoreContext);
  const first = uiStore.firstSelectedFile;

  if (first === undefined) {
    return (
      <aside id="inspector">
        <Placeholder />
      </aside>
    );
  }

  const path = first.absolutePath;
  const handleOpenFileExplorer = useCallback(() => shell.showItemInFolder(path), [path]);

  return (
    <aside id="inspector">
      <section>
        <header>
          <h2>Information</h2>
        </header>
        <ImageInfo file={first} />
      </section>
      <section>
        <header>
          <h2>Path to file</h2>
        </header>
        <div className="file-path">
          <small>{path}</small>
          <IconButton icon={IconSet.FOLDER_CLOSE} onClick={handleOpenFileExplorer} text={path} />
        </div>
      </section>
      <section>
        <header>
          <h2>Tags</h2>
        </header>
        <FileTags />
      </section>
    </aside>
  );
});

export default Inspector;

const Placeholder = () => {
  return (
    <section>
      <header>
        <h2>No image selected</h2>
      </header>
    </section>
  );
};
