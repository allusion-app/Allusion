import React from 'react';
import { observer } from 'mobx-react-lite';
import { useTranslation } from 'react-i18next';

import { useStore } from '../../contexts/StoreContext';
import FileTags from '../../components/FileTag';
import ImageInfo from '../../components/ImageInfo';
import { IconButton, IconSet } from 'widgets';
import { shell } from 'electron';
import { IS_PREVIEW_WINDOW } from 'common/window';

const Inspector = observer(() => {
  const { t } = useTranslation();
  const { uiStore, fileStore } = useStore();

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
        <ImageInfo file={first} />
      </section>
      <section>
        <header>
          <h2>{t('imageInfo.pathToFile', 'Path to file')}</h2>
        </header>
        <div className="input-file">
          <input readOnly className="input input-file-value" value={path} />
          <IconButton
            icon={IconSet.FOLDER_CLOSE}
            onClick={() => shell.showItemInFolder(path)}
            text={t('app.openInFileBrowser')}
          />
        </div>
      </section>
      {/* Modifying state in preview window is not supported (not in sync updated in main window) */}
      {!IS_PREVIEW_WINDOW && (
        <section>
          <header>
            <h2>{t('tag.title', 'Tags')}</h2>
          </header>
          <FileTags file={first} />
        </section>
      )}
    </aside>
  );
});

export default Inspector;

const Placeholder = () => {
  const { t } = useTranslation();
  return (
    <section>
      <header>
        <h2>{t('inspector.noImageSelected', 'No image selected')}</h2>
      </header>
    </section>
  );
};
