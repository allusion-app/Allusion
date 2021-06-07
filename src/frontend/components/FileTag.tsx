import { observer } from 'mobx-react-lite';
import React, { useCallback, useContext } from 'react';
import { ClientFile } from 'src/entities/File';
import { IconSet } from 'widgets/Icons';
import { Row } from 'widgets';
import StoreContext from '../contexts/StoreContext';
import { TagSelector } from './TagSelector';

interface IFileTagProp {
  file: ClientFile;
}

const FileTags = observer(({ file }: IFileTagProp) => {
  const { tagStore } = useContext(StoreContext);

  const renderCreateOption = useCallback(
    (tagName: string, resetTextBox: () => void, isFocused: (index: number) => boolean) => (
      <Row
        key="create"
        value={`Create tag "${tagName}"`}
        icon={IconSet.TAG_ADD}
        onClick={async () => {
          const tag = await tagStore.create(tagStore.root, tagName);
          file.addTag(tag);
          resetTextBox();
        }}
        focused={isFocused(0)}
      />
    ),
    [file, tagStore],
  );

  return (
    <TagSelector
      multiselectable
      disabled={file.isBroken}
      selection={Array.from(file.tags)}
      onClear={file.clearTags}
      onDeselect={file.removeTag}
      onSelect={file.addTag}
      renderCreateOption={renderCreateOption}
    />
  );
});

export default FileTags;
