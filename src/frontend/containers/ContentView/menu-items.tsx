import { shell } from 'electron';
import { action } from 'mobx';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { ClientFile } from 'src/entities/File';
import { useStore } from 'src/frontend/contexts/StoreContext';
import { RendererMessenger } from 'src/Messaging';
import { IconSet } from 'widgets';
import { MenuItem } from 'widgets/menus';

export const MissingFileMenuItems = observer(() => {
  const { uiStore } = useStore();
  return (
    <>
      <MenuItem
        onClick={uiStore.viewMissingContent}
        text="Open Recovery Panel"
        icon={IconSet.WARNING_BROKEN_LINK}
        disabled={uiStore.showsMissingContent}
      />
      <MenuItem onClick={uiStore.openToolbarFileRemover} text="Delete" icon={IconSet.DELETE} />
    </>
  );
});

export const FileViewerMenuItems = ({ file }: { file: ClientFile }) => {
  const { uiStore, fileStore } = useStore();

  const handleViewFullSize = () => {
    fileStore.select(file, true);
    uiStore.setFirstItem(fileStore.getIndex(file.id));
    uiStore.toggleSlideMode();
  };

  const handlePreviewWindow = action(() => {
    // Only clear selection if file is not already selected
    fileStore.select(file, !fileStore.selection.has(file));
    uiStore.setFirstItem(fileStore.getIndex(file.id));
    RendererMessenger.openPreviewWindow(
      Array.from(fileStore.selection, (f) => f.id),
      uiStore.preferences.thumbnailDirectory,
    );
  });

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
  const { uiStore, fileStore } = useStore();
  const handlePreviewWindow = action(() => {
    fileStore.select(file, true);
    uiStore.setFirstItem(fileStore.getIndex(file.id));
    RendererMessenger.openPreviewWindow(
      Array.from(fileStore.selection, (f) => f.id),
      uiStore.preferences.thumbnailDirectory,
    );
  });

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
