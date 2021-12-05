import { observer } from 'mobx-react-lite';
import React, { useCallback } from 'react';
import { ClientFile } from 'src/entities/File';
import { IconSet } from 'widgets/Icons';
import { Row } from 'widgets';
import { useStore } from '../contexts/StoreContext';
import { TagSelector } from './TagSelector';
import useContextMenu from '../hooks/useContextMenu';
import { FileTagMenuItems } from '../containers/ContentView/menu-items';
import { ClientTag } from 'src/entities/Tag';
import { ContextMenu, Menu } from 'widgets/menus';

interface IFileTagProp {
  file: ClientFile;
}

const FileTags = observer(({ file }: IFileTagProp) => {
  const { tagStore } = useStore();

  const [contextState, { show, hide }] = useContextMenu();

  const renderCreateOption = useCallback(
    (tagName: string, resetTextBox: () => void) => (
      <Row
        id="file-tags-create-option"
        key="create"
        value={`Create tag "${tagName}"`}
        icon={IconSet.TAG_ADD}
        onClick={async () => {
          const tag = await tagStore.create(tagStore.root, tagName);
          file.addTag(tag);
          resetTextBox();
        }}
      />
    ),
    [file, tagStore],
  );

  const handleTagContextMenu = useCallback(
    (event: React.MouseEvent<HTMLElement>, tag: ClientTag) => {
      event.stopPropagation();
      show(event.clientX, event.clientY, [
        <React.Fragment key="file-tag-context-menu">
          <FileTagMenuItems file={file} tag={tag} />
        </React.Fragment>,
      ]);
    },
    [file, show],
  );

  return (
    <>
      <TagSelector
        disabled={file.isBroken}
        selection={Array.from(file.tags)}
        onClear={file.clearTags}
        onDeselect={file.removeTag}
        onSelect={file.addTag}
        renderCreateOption={renderCreateOption}
        showTagContextMenu={handleTagContextMenu}
        multiline
      />

      {/* TODO: probably not the right place for the ContextMenu component.
      Why not a single one at the root element that can be interacted with through a Context? */}
      <ContextMenu
        isOpen={contextState.open}
        x={contextState.x}
        y={contextState.y}
        close={hide}
        usePortal
      >
        <Menu>{contextState.menu}</Menu>
      </ContextMenu>
    </>
  );
});

export default FileTags;
