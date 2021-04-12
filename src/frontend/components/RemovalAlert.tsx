import React, { useContext, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { action } from 'mobx';

import { ClientLocation } from 'src/entities/Location';
import { ClientTag } from 'src/entities/Tag';
import StoreContext from 'src/frontend/contexts/StoreContext';
import { Tag, IconSet } from 'widgets';
import { Alert, DialogButton } from 'widgets/popovers';
import { MultiTagSelector } from './MultiTagSelector';

interface IRemovalProps<T> {
  object: T;
  onClose: () => void;
}

export const LocationRemoval = (props: IRemovalProps<ClientLocation>) => (
  <RemovalAlert
    open
    title={`Are you sure you want to delete the location "${props.object.name}"?`}
    information="This will permanently remove the location and all data linked to its images in Allusion."
    onCancel={props.onClose}
    onConfirm={() => {
      props.onClose();
      props.object.delete();
    }}
  />
);

export const TagRemoval = observer((props: IRemovalProps<ClientTag>) => {
  const { uiStore } = useContext(StoreContext);
  const { object } = props;
  const tagsToRemove = object.isSelected ? Array.from(uiStore.tagSelection) : object.toList();

  const text = `Are you sure you want to delete the tag "${object.name}"?`;

  return (
    <RemovalAlert
      open
      title={text}
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
      onCancel={props.onClose}
      onConfirm={() => {
        props.onClose();
        object.isSelected ? uiStore.removeSelectedTags() : props.object.delete();
      }}
    />
  );
});

export const TagMerge = observer((props: IRemovalProps<ClientTag>) => {
  const { tagStore } = useContext(StoreContext);
  const { object: tag } = props;

  const text = `Select the tag you want to merge "${tag.name}" with`;

  const [selectedTag, setSelectedTag] = useState<ClientTag>();

  return (
    <MergeAlert
      open
      title={text}
      information={
        tag.subTags.length > 0
          ? 'Merging a tag with sub-tags is currently not supported.'
          : `This will replace all uses of ${tag.name} with ${
              selectedTag?.name || 'the tag you select'
            }. Choose the merge option on the other tag to merge the other way around!`
      }
      body={
        <div>
          <MultiTagSelector
            selection={selectedTag ? [selectedTag] : []}
            onSelect={setSelectedTag}
            onDeselect={() => setSelectedTag(undefined)}
            onClear={() => setSelectedTag(undefined)}
          />
        </div>
      }
      onCancel={props.onClose}
      onConfirm={
        tag.subTags.length > 0
          ? () => null
          : () => {
              if (selectedTag) {
                tagStore.merge(tag, selectedTag);
                props.onClose();
              }
            }
      }
    />
  );
});

export const FileRemoval = observer(() => {
  const { fileStore, uiStore } = useContext(StoreContext);
  const selection = uiStore.fileSelection;

  const handleConfirm = action(() => {
    uiStore.closeToolbarFileRemover();
    const files = [];
    for (const file of selection) {
      if (file.isBroken === true) {
        files.push(file);
      }
    }
    fileStore.deleteFiles(files);
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

const MergeAlert = (props: IRemovalAlertProps) => (
  <Alert
    open={props.open}
    title={props.title}
    information={props.information}
    view={props.body}
    icon={IconSet.WARNING}
    closeButtonText="Cancel"
    primaryButtonText="Merge"
    defaultButton={DialogButton.PrimaryButton}
    onClick={(button) =>
      button === DialogButton.CloseButton ? props.onCancel() : props.onConfirm()
    }
  />
);
