import { observer } from 'mobx-react-lite';
import React, { useContext } from 'react';
import { ClientFile } from 'src/entities/File';
import { IconSet } from 'widgets/Icons';
import StoreContext from '../contexts/StoreContext';
import { MultiTagSelector } from './MultiTagSelector';

interface IFileTagProp {
  file: ClientFile;
}

const FileTags = observer(({ file }: IFileTagProp) => {
  const { tagStore } = useContext(StoreContext);
  const handleCreate = async (name: string) =>
    file.addTag(await tagStore.create(tagStore.root, name));

  return (
    <MultiTagSelector
      disabled={file.isBroken}
      selection={Array.from(file.tags)}
      onClear={file.clearTags}
      onDeselect={file.removeTag}
      onSelect={file.addTag}
      extraOptions={[
        {
          id: 'create',
          icon: IconSet.TAG_ADD,
          label: (input: string) => `Create tag "${input}"`,
          action: handleCreate,
          resetQueryOnAction: true,
        },
      ]}
    />
  );
});

export default FileTags;
