import React, { useState } from 'react';
import { observer } from 'mobx-react-lite';
import { ClientTag } from 'src/entities/Tag';
import { useStore } from 'src/frontend/contexts/StoreContext';
import { Button, GridCombobox, GridOption, GridOptionCell, IconSet } from 'widgets';
import { Dialog } from 'widgets/popovers';
import { action } from 'mobx';

interface TagMergeProps {
  tag: ClientTag;
  onClose: () => void;
}

export const TagMerge = observer(({ tag, onClose }: TagMergeProps) => {
  const { tagStore } = useStore();

  const [selectedTag, setSelectedTag] = useState<ClientTag>();

  const merge = () => {
    if (selectedTag !== undefined) {
      tagStore.merge(tag, selectedTag);
      onClose();
    }
  };

  return (
    <Dialog
      open
      title={`Merge Tag ${tag.name} With`}
      icon={IconSet.TAG_GROUP}
      onCancel={onClose}
      describedby="merge-info"
    >
      <p id="merge-info">This will replace all uses of {tag.name} with the tag you select.</p>
      <form method="dialog" onSubmit={(e) => e.preventDefault()}>
        <fieldset>
          <legend>Merge {tag.name} with</legend>
          <GridCombobox
            autoFocus
            isSelected={(option: ClientTag, selection: ClientTag | undefined) =>
              option === selection
            }
            value={selectedTag}
            onChange={setSelectedTag}
            data={tagStore.tagList}
            labelFromOption={labelFromOption}
            renderOption={renderTagOption}
            colcount={2}
          />
        </fieldset>

        <fieldset className="dialog-actions">
          <Button
            text="Merge"
            styling="filled"
            onClick={merge}
            disabled={selectedTag === undefined}
          />
        </fieldset>
      </form>
    </Dialog>
  );
});

const labelFromOption = action((t: ClientTag) => t.name);

const renderTagOption = action((tag: ClientTag, index: number, selection: boolean) => {
  const id = tag.id;
  const path = tag.treePath.map((t: ClientTag) => t.name).join(' › ') ?? [];
  const hint = path.slice(0, Math.max(0, path.length - tag.name.length - 3));

  return (
    <GridOption key={id} rowIndex={index} selected={selection || undefined} data-tooltip={path}>
      <GridOptionCell id={id} colIndex={1}>
        <span
          className="combobox-popup-option-icon"
          style={{ color: tag.viewColor }}
          aria-hidden={true}
        >
          {IconSet.TAG}
        </span>
        {tag.name}
      </GridOptionCell>
      <GridOptionCell className="tag-option-hint" id={id + '-hint'} colIndex={2}>
        {hint}
      </GridOptionCell>
    </GridOption>
  );
});
