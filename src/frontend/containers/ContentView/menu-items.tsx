import { shell } from 'electron';
import { observer } from 'mobx-react-lite';
import SysPath from 'path';
import React from 'react';

import { IconSet } from 'widgets';
import { MenuItem, MenuRadioItem, MenuSubItem } from 'widgets/menus';
import { useStore } from '../../contexts/StoreContext';
import { ClientFile } from '../../entities/File';
import {
  ClientDateSearchCriteria,
  ClientFileSearchCriteria,
  ClientNumberSearchCriteria,
  ClientStringSearchCriteria,
  ClientTagSearchCriteria,
} from '../../entities/SearchCriteria';
import { ClientTag } from '../../entities/Tag';
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
  const { uiStore, locationStore } = useStore();

  const handleViewFullSize = () => {
    uiStore.selectFile(file, true);
    uiStore.enableSlideMode();
  };

  const handlePreviewWindow = () => {
    // Only clear selection if file is not already selected
    uiStore.selectFile(file, !uiStore.fileSelection.has(file));
    uiStore.openPreviewWindow();
  };

  const handleSearchSimilar = (
    e: React.MouseEvent,
    crit: ClientFileSearchCriteria | ClientFileSearchCriteria[],
  ) => {
    const crits = Array.isArray(crit) ? crit : [crit];
    if (e.ctrlKey) {
      uiStore.addSearchCriterias(crits);
    } else {
      uiStore.replaceSearchCriterias(crits);
    }
  };

  return (
    <>
      <MenuItem onClick={handleViewFullSize} text="View at Full Size" icon={IconSet.SEARCH} />
      <MenuItem
        onClick={handlePreviewWindow}
        text="Open In Preview Window"
        icon={IconSet.PREVIEW}
      />
      <MenuItem
        onClick={uiStore.openToolbarTagPopover}
        text="Open Tag Selector"
        icon={IconSet.TAG}
      />
      <MenuSubItem text="Search Similar Images..." icon={IconSet.MORE}>
        <MenuItem
          onClick={(e) =>
            handleSearchSimilar(
              e,
              file.tags.toJSON().map((t) => new ClientTagSearchCriteria('tags', t.id, 'contains')),
            )
          }
          text="Same Tags"
          icon={IconSet.TAG}
        />
        <MenuItem
          onClick={(e) =>
            handleSearchSimilar(
              e,
              new ClientStringSearchCriteria(
                'absolutePath',
                SysPath.dirname(file.absolutePath) + SysPath.sep,
                'startsWith',
              ),
            )
          }
          text="Same Directory"
          icon={IconSet.FOLDER_CLOSE}
        />
        <MenuItem
          onClick={(e) =>
            handleSearchSimilar(
              e,
              new ClientStringSearchCriteria(
                'absolutePath',
                locationStore.get(file.locationId)!.path + SysPath.sep,
                'startsWith',
              ),
            )
          }
          text="Same Location"
        />
        <MenuItem
          onClick={(e) =>
            handleSearchSimilar(
              e,
              new ClientStringSearchCriteria('extension', file.extension, 'equals'),
            )
          }
          text="Same File Type"
          icon={IconSet.FILTER_FILE_TYPE}
        />
        <MenuItem
          onClick={(e) =>
            handleSearchSimilar(e, [
              new ClientNumberSearchCriteria('width', file.width, 'equals'),
              new ClientNumberSearchCriteria('height', file.height, 'equals'),
            ])
          }
          text="Same Resolution"
          icon={IconSet.ARROW_RIGHT}
        />
        <MenuItem
          onClick={(e) =>
            handleSearchSimilar(e, new ClientNumberSearchCriteria('size', file.size, 'equals'))
          }
          text="Same File Size"
          icon={IconSet.FILTER_FILTER_DOWN}
        />
        <MenuItem
          onClick={(e) =>
            handleSearchSimilar(
              e,
              new ClientDateSearchCriteria('dateCreated', file.dateCreated, 'equals'),
            )
          }
          text="Same Creation Date"
          icon={IconSet.FILTER_DATE}
        />
        <MenuItem
          onClick={(e) =>
            handleSearchSimilar(
              e,
              new ClientDateSearchCriteria('dateModified', file.dateModified, 'equals'),
            )
          }
          text="Same Modification Date"
        />
      </MenuSubItem>
    </>
  );
};

export const SlideFileViewerMenuItems = observer(({ file }: { file: ClientFile }) => {
  const { uiStore } = useStore();

  const handlePreviewWindow = () => {
    uiStore.selectFile(file, true);
    uiStore.openPreviewWindow();
  };

  const handleCopyToClipboard = () => {
    uiStore.selectFile(file, true);
    uiStore.copyToClipboard();
  };

  return (
    <>
      <MenuItem onClick={handleCopyToClipboard} text="Copy" icon={IconSet.COPY} />
      <MenuItem
        onClick={handlePreviewWindow}
        text="Open In Preview Window"
        icon={IconSet.PREVIEW}
      />

      <MenuSubItem text="Upscale filtering..." icon={IconSet.VIEW_GRID}>
        <MenuRadioItem
          onClick={uiStore.setUpscaleModeSmooth}
          checked={uiStore.upscaleMode === 'smooth'}
          text="Smooth"
        />
        <MenuRadioItem
          onClick={uiStore.setUpscaleModePixelated}
          checked={uiStore.upscaleMode === 'pixelated'}
          text="Pixelated"
        />
      </MenuSubItem>
    </>
  );
});

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
