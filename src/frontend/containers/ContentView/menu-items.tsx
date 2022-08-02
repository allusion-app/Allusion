import { shell } from 'electron';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { ClientFile } from 'src/entities/File';
import { ClientTag } from 'src/entities/Tag';
import { useStore } from 'src/frontend/contexts/StoreContext';
import { IconSet } from 'widgets';
import { MenuItem } from 'widgets/menus';
import { LocationTreeItemRevealer } from '../Outliner/LocationsPanel';
import { TagsTreeItemRevealer } from '../Outliner/TagsPanel/TagsTree';

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
    uiStore.enableSlideMode();
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

export const ExternalAppMenuItems = observer(({ file }: { file: ClientFile }) => {
  const { uiStore } = useStore();
  return (
    <>
      <MenuItem
        onClick={() => uiStore.openExternal()}
        text="Open External"
        icon={IconSet.OPEN_EXTERNAL}
        disabled={file.isBroken}
      />
      <MenuItem
        onClick={() =>
          LocationTreeItemRevealer.instance.revealSubLocation(file.locationId, file.absolutePath)
        }
        text="Reveal in Locations Panel"
        icon={IconSet.TREE_LIST}
      />
      <MenuItem
        onClick={() => shell.showItemInFolder(file.absolutePath)}
        text="Reveal in File Browser"
        icon={IconSet.FOLDER_CLOSE}
      />
      <MenuItem
        onClick={uiStore.openMoveFilesToTrash}
        text={`Delete file${uiStore.fileSelection.size > 1 ? 's' : ''}`}
        icon={IconSet.DELETE}
      />
    </>
  );
});

export const FileTagMenuItems = observer(({ file, tag }: { file: ClientFile; tag: ClientTag }) => (
  <>
    <MenuItem
      onClick={() => TagsTreeItemRevealer.instance.revealTag(tag)}
      text="Reveal in Tags Panel"
      icon={IconSet.TREE_LIST}
      disabled={file.isBroken}
    />
    <MenuItem
      onClick={() => file.removeTag(tag)}
      text="Unassign Tag from File"
      icon={IconSet.TAG_BLANCO}
    />
  </>
));
