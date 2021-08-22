import React, { useState } from 'react';
import { observer } from 'mobx-react-lite';
import { ClientTag } from 'src/entities/Tag';
import { useStore } from 'src/frontend/contexts/StoreContext';
import { Button, IconSet } from 'widgets';
import { Dialog } from 'widgets/popovers';

interface TagMergeProps {
  tag: ClientTag;
  onClose: () => void;
}

export const TagMerge = observer(({ tag, onClose }: TagMergeProps) => {
  const { tagStore } = useStore();

  const [selectedTag, setSelectedTag] = useState<ClientTag>();

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    setSelectedTag(tagStore.get(id));
  };

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
          <select autoFocus value={selectedTag?.id} onChange={handleChange} required>
            <option value="">— Choose a tag —</option>
            {tagStore.tagList.map((tag) => {
              const hint =
                tag.treePath.length < 2
                  ? ''
                  : ` (${tag.treePath
                      .slice(0, -1)
                      .map((t) => t.name)
                      .join(' › ')})`;

              return (
                <option key={tag.id} value={tag.id}>
                  {tag.name}
                  {hint}
                </option>
              );
            })}
          </select>
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
