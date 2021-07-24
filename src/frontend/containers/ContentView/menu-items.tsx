import { shell } from 'electron';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { ClientFile } from 'src/entities/File';
import { useStore } from 'src/frontend/contexts/StoreContext';
import { IconSet } from 'widgets';
import { MenuItem } from 'widgets/menus';
import { LocationTreeRevealer } from '../Outliner/LocationsPanel';

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
      onClick={() => LocationTreeRevealer.revealSubLocation(file.locationId, file.absolutePath)}
      text="Reveal in Locations Panel"
      icon={IconSet.TREE_LIST}
    />
    <MenuItem
      onClick={() => shell.showItemInFolder(file.absolutePath)}
      text="Reveal in File Browser"
      icon={IconSet.FOLDER_CLOSE}
    />
    <MenuItem
      onClick={() =>
        // TODO: also for file selection?
        window.confirm(
          // eslint-disable-next-line quotes
          "Are you sure you want to delete this file?\nYou will be able to recover it from your system's trash bin.",
        ) && shell.moveItemToTrash(file.absolutePath)
      }
      text="Delete file"
      icon={IconSet.DELETE}
    />
  </>
));
