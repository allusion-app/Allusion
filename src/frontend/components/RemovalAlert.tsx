import React, { useState } from 'react';
import { observer } from 'mobx-react-lite';
import { action } from 'mobx';

import { ClientLocation } from 'src/entities/Location';
import { ClientTag } from 'src/entities/Tag';
import { useStore } from 'src/frontend/contexts/StoreContext';
import { Tag, IconSet } from 'widgets';
import { Alert, DialogButton } from 'widgets/popovers';
import { MultiTagSelector } from './MultiTagSelector';
import { ClientTagSearchCriteria } from 'src/entities/SearchCriteria';

interface IRemovalProps<T> {
  object: T;
  onClose: () => void;
}

export const LocationRemoval = ({ object: location, onClose }: IRemovalProps<ClientLocation>) => {
  const { locationStore, uiStore, fileStore } = useStore();

  // Batch actions
  const deleteLocation = action(async () => {
    onClose();
    await locationStore.delete(location);
    await uiStore.refetch();
    await fileStore.refetchFileCounts();
  });

  return (
    <RemovalAlert
      open
      title={`Are you sure you want to delete the location "${location.name}"?`}
      information="This will permanently remove the location and all data linked to its images in Allusion."
      onCancel={onClose}
      onConfirm={deleteLocation}
    />
  );
};

export const TagRemoval = observer(({ object: tag, onClose }: IRemovalProps<ClientTag>) => {
  const { uiStore, tagStore } = useStore();
  const isSelected = tagStore.isSelected(tag);
  const tagsToRemove = isSelected ? Array.from(tagStore.selection) : tag.getSubTreeList();

  const title = `Are you sure you want to delete the tag "${tag.name}"?`;

  // Needs to be batched, otherwise ClientFile reaction will run and crash the app.
  const deleteTags = action(async () => {
    onClose();
    const deletedTags = isSelected ? tagsToRemove : [tag];
    uiStore.filterCriterias(
      (c) =>
        !(
          c instanceof ClientTagSearchCriteria &&
          c.value.length === 1 &&
          deletedTags.some((t) => c.value[0] === t.id)
        ),
    );
    await tagStore.delete(deletedTags);
    await uiStore.refetch();
  });

  return (
    <RemovalAlert
      open
      title={title}
      information="Deleting tags or collections will permanently remove them from Allusion."
      body={
        tagsToRemove.length > 0 && (
          <div id="tag-remove-overview">
            <p>Selected Tags</p>
            {tagsToRemove.map((tag) => (
              <Tag key={tag.id} text={tag.name} color={tag.viewColor} />
            ))}
          </div>
        )
      }
      onCancel={onClose}
      onConfirm={deleteTags}
    />
  );
});

export const TagMerge = observer(({ object: tag, onClose }: IRemovalProps<ClientTag>) => {
  const { tagStore, uiStore } = useStore();

  const [selectedTag, setSelectedTag] = useState<Readonly<ClientTag> | undefined>();

  const title = `Select the tag you want to merge "${tag.name}" with`;

  const information =
    tag.subTags.length > 0
      ? 'Merging a tag with sub-tags is currently not supported.'
      : `This will replace all uses of ${tag.name} with ${
          selectedTag?.name ?? 'the tag you select'
        }. Choose the merge option on the other tag to merge the other way around!`;

  const clearSelection = () => setSelectedTag(undefined);

  const body = (
    <div>
      <MultiTagSelector
        selection={selectedTag !== undefined ? [selectedTag] : []}
        onSelect={setSelectedTag}
        onDeselect={clearSelection}
        onClear={clearSelection}
      />
    </div>
  );

  const handleClick = action(async (button: DialogButton) => {
    if (button === DialogButton.CloseButton) {
      onClose();
    } else if (tag.subTags.length === 0 && selectedTag !== undefined) {
      onClose();
      await tagStore.merge(tag, selectedTag);
      return uiStore.refetch();
    }
  });

  return (
    <Alert
      open
      title={title}
      information={information}
      view={body}
      icon={IconSet.WARNING}
      closeButtonText="Cancel"
      primaryButtonText="Merge"
      defaultButton={DialogButton.PrimaryButton}
      onClick={handleClick}
    />
  );
});

export const FileRemoval = observer(() => {
  const { fileStore, uiStore } = useStore();
  const selection = fileStore.selection;

  // Batch actions
  const handleConfirm = action(async () => {
    uiStore.closeToolbarFileRemover();
    const files = [];
    for (const file of selection) {
      if (file.isBroken === true) {
        files.push(file);
      }
    }
    await fileStore.delete(files);
  });

  return (
    <RemovalAlert
      open={uiStore.isToolbarFileRemoverOpen}
      title={`Are you sure you want to delete ${selection.size} missing file${
        selection.size > 1 ? 's' : ''
      }?`}
      information="Deleting files will permanently remove them from Allusion, so any tags saved on them will be lost. If you move files back into their location, they will be automatically detected by Allusion."
      body={
        <div className="deletion-confirmation-list">
          {Array.from(selection).map((f) => (
            <div key={f.id}>{f.absolutePath}</div>
          ))}
        </div>
      }
      onCancel={uiStore.closeToolbarFileRemover}
      onConfirm={handleConfirm}
    />
  );
});

interface IRemovalAlertProps {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  title: string;
  information: string;
  body?: React.ReactNode;
}

const RemovalAlert = (props: IRemovalAlertProps) => (
  <Alert
    open={props.open}
    title={props.title}
    information={props.information}
    view={props.body}
    icon={IconSet.WARNING}
    closeButtonText="Cancel"
    primaryButtonText="Delete"
    defaultButton={DialogButton.PrimaryButton}
    onClick={(button) =>
      button === DialogButton.CloseButton ? props.onCancel() : props.onConfirm()
    }
  />
);
