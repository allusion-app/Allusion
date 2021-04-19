import React, { useContext } from 'react';
import { observer } from 'mobx-react-lite';

import StoreContext from '../../contexts/StoreContext';
import FileTags from '../../components/FileTag';
import ImageInfo from '../../components/ImageInfo';
import { IconButton, IconSet } from 'widgets';
import { shell } from 'electron';

const Inspector = observer(() => {
  const { uiStore, fileStore } = useContext(StoreContext);

  if (uiStore.firstItem >= fileStore.fileList.length || !uiStore.isInspectorOpen) {
    return (
      <aside id="inspector">
        <Placeholder />
      </aside>
    );
  }

  const first = fileStore.fileList[uiStore.firstItem];
  const path = first.absolutePath;

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
        <div className="input-file">
          <input readOnly className="input input-file-value" value={path} />
          <IconButton
            icon={IconSet.FOLDER_CLOSE}
            onClick={() => shell.showItemInFolder(path)}
            text="Open in file explorer"
          />
        </div>
      </section>
      <section>
        <header>
          <h2>Tags</h2>
        </header>
        <FileTags file={first} />
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
