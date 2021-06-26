import { shell } from 'electron';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { ClientFile } from 'src/entities/File';
import { useStore } from 'src/frontend/contexts/StoreContext';
import { IconSet } from 'widgets';
import { MenuItem } from 'widgets/menus';

export const MissingFileMenuItems = observer(() => {
  const { uiStore, fileStore } = useStore();
  return (
    <>
      <MenuItem
        onClick={fileStore.fetchMissingFiles}
        text="Open Recovery Panel"
        icon={IconSet.WARNING_BROKEN_LINK}
        disabled={fileStore.showsMissingContent}
      />
      <MenuItem onClick={uiStore.openToolbarFileRemover} text="Delete" icon={IconSet.DELETE} />
    </>
  );
});

export const FileViewerMenuItems = ({ file }: { file: ClientFile }) => {
  const { uiStore } = useStore();

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
      {/* Request: "Open path in Location hierarchy" */}
      {/* IDEA: "View similar images" > ["Same tags", "Same directory", ("Same size/resolution/colors?)")] */}
      <MenuItem
        onClick={uiStore.openToolbarTagPopover}
        text="Open Tag Selector"
        icon={IconSet.TAG}
      />
    </>
  );
};

export const SlideFileViewerMenuItems = ({ file }: { file: ClientFile }) => {
  const { uiStore } = useStore();

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

export const ExternalAppMenuItems = observer(({ file }: { file: ClientFile }) => (
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
));
