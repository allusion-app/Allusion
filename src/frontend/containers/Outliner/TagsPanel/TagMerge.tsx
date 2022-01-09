import { action } from 'mobx';
import { observer } from 'mobx-react-lite';
import React, { useState } from 'react';
import { ClientTag } from 'src/entities/Tag';
import { useStore } from 'src/frontend/contexts/StoreContext';
import { Button, GridCombobox, GridOption, GridOptionCell, IconSet, Tag } from 'widgets';
import { Dialog } from 'widgets/popovers';

interface TagMergeProps {
  tag: ClientTag;
  onClose: () => void;
}

/** this component is only shown when all tags in the context do not have child-tags */
export const TagMerge = observer(({ tag, onClose }: TagMergeProps) => {
  const { tagStore, uiStore } = useStore();

  const ctxTags = uiStore.getTagContextItems(tag.id);

  const [selectedTag, setSelectedTag] = useState<ClientTag>();

  const mergingWithSelf = ctxTags.some((t) => t.id === selectedTag?.id);

  const merge = () => {
    if (selectedTag !== undefined && !mergingWithSelf) {
      for (const ctxTag of ctxTags) {
        tagStore.merge(ctxTag, selectedTag);
      }
      onClose();
    }
  };

  const plur = ctxTags.length === 1 ? '' : 's';

  return (
    <Dialog
      open
      title={`Merge Tag${plur} With`}
      icon={IconSet.TAG_GROUP}
      onCancel={onClose}
      describedby="merge-info"
    >
      <p id="merge-info">
        This will replace all uses of the chosen tag{plur} with the tag you select below.
      </p>
      <form method="dialog" onSubmit={(e) => e.preventDefault()}>
        <fieldset>
          <legend>Merge tag{plur} with</legend>
          <div id="tag-merge-overview">
            <span>Tag{plur} to merge</span>
            <br />
            {ctxTags.map((tag) => (
              <Tag key={tag.id} text={tag.name} color={tag.viewColor} />
            ))}
          </div>

          <br />

          <label htmlFor="tag-merge-picker">Merge with</label>
          <GridCombobox
            textboxId="tag-merge-picker"
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
          {mergingWithSelf && (
            <span className="form-error">You cannot merge a tag with itself.</span>
          )}
        </fieldset>

        <fieldset className="dialog-actions">
          <Button
            text="Merge"
            styling="filled"
            onClick={merge}
            disabled={selectedTag === undefined || mergingWithSelf}
          />
        </fieldset>
      </form>
    </Dialog>
  );
});

const labelFromOption = action((t: ClientTag) => t.name);

const renderTagOption = action((tag: ClientTag, index: number, selection: boolean) => {
  const id = tag.id;
  const path = tag.treePath.map((t: ClientTag) => t.name).join(' › ');
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
