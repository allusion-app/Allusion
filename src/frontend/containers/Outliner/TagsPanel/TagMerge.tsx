import React, { useState } from 'react';
import { observer } from 'mobx-react-lite';
import { ClientTag } from 'src/entities/Tag';
import { useStore } from 'src/frontend/contexts/StoreContext';
import { Button, IconSet } from 'widgets';
import { Dialog } from 'widgets/popovers';
import { TagSelector } from 'src/frontend/components/TagSelector';

interface TagMergeProps {
  tag: ClientTag;
  onClose: () => void;
}

export const TagMerge = observer(({ tag, onClose }: TagMergeProps) => {
  const { tagStore } = useStore();

  const [selectedTag, setSelectedTag] = useState<ClientTag>();
  const clearSelection = () => setSelectedTag(undefined);

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
      onClose={onClose}
      describedby="merge-info"
    >
      <p id="merge-info">This will replace all uses of {tag.name} with the tag you select.</p>
      <form method="dialog" onSubmit={merge}>
        <fieldset>
          <legend>Merge {tag.name} with</legend>
          <label htmlFor="tag-merge-selection">Selection</label>
          <TagSelector
            id="tag-merge-selection"
            multiselectable={false}
            selection={selectedTag !== undefined ? [selectedTag] : []}
            onSelect={setSelectedTag}
            onDeselect={clearSelection}
            onClear={clearSelection}
          />
        </fieldset>

        <fieldset className="dialog-actions">
          <Button
            type="submit"
            text="Merge"
            styling="filled"
            onClick={() => {
              if (selectedTag !== undefined) {
                tagStore.merge(tag, selectedTag);
                onClose();
              }
            }}
            disabled={selectedTag === undefined}
          />
        </fieldset>
      </form>
    </Dialog>
  );
});
