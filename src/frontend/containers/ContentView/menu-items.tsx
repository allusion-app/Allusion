import { shell } from 'electron';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { ClientFile } from 'src/entities/File';
import FileStore from 'src/frontend/stores/FileStore';
import UiStore from 'src/frontend/stores/UiStore';
import { IconSet } from 'widgets';
import { MenuItem } from 'widgets/menus';

export const MissingFileMenuItems = observer(
  ({ uiStore, fileStore }: { uiStore: UiStore; fileStore: FileStore }) => (
    <>
      <MenuItem
        onClick={fileStore.fetchMissingFiles}
        text="Open Recovery Panel"
        icon={IconSet.WARNING_BROKEN_LINK}
        disabled={fileStore.showsMissingContent}
      />
      <MenuItem onClick={uiStore.openToolbarFileRemover} text="Delete" icon={IconSet.DELETE} />
    </>
  ),
);

export const FileViewerMenuItems = ({ file, uiStore }: { file: ClientFile; uiStore: UiStore }) => {
  const handleViewFullSize = () => {
    uiStore.selectFile(file, true);
    uiStore.toggleSlideMode();
  };

  const handlePreviewWindow = () => {
    // Only clear selection if file is not already selected
    uiStore.selectFile(file, !uiStore.fileSelection.has(file));
    uiStore.openPreviewWindow();
  };

  return (
    <>
      <MenuItem onClick={handleViewFullSize} text="View at Full Size" icon={IconSet.SEARCH} />
      <MenuItem
        onClick={handlePreviewWindow}
        text="Open In Preview Window"
        icon={IconSet.PREVIEW}
      />
    </>
  );
};

export const SlideFileViewerMenuItems = ({
  file,
  uiStore,
}: {
  file: ClientFile;
  uiStore: UiStore;
}) => {
  const handlePreviewWindow = () => {
    uiStore.selectFile(file, true);
    uiStore.openPreviewWindow();
  };

  return (
    <>
      <MenuItem
        onClick={handlePreviewWindow}
        text="Open In Preview Window"
        icon={IconSet.PREVIEW}
      />
    </>
  );
};

export const ExternalAppMenuItems = ({ file }: { file: ClientFile }) => (
  <>
    <MenuItem
      onClick={() => shell.openExternal(`file://${file.absolutePath}`).catch(console.error)}
      text="Open External"
      icon={IconSet.OPEN_EXTERNAL}
      disabled={file.isBroken}
    />
    <MenuItem
      onClick={() => shell.showItemInFolder(file.absolutePath)}
      text="Reveal in File Browser"
      icon={IconSet.FOLDER_CLOSE}
    />
  </>
);
