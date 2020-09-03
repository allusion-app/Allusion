import React, { useContext } from 'react';
import { Tag } from '@blueprintjs/core';
import IconSet from 'components/Icons';
import { ClientLocation } from 'src/renderer/entities/Location';
import StoreContext from '../contexts/StoreContext';
import { ClientTagCollection } from 'src/renderer/entities/TagCollection';
import { ClientTag } from 'src/renderer/entities/Tag';
import { ClientFile } from 'src/renderer/entities/File';
import { Alert, DialogButton } from 'components';

interface IRemovalAlertProps {
  isOpen: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  title: string;
  information: string;
  body?: React.ReactNode;
}

const RemovalAlert = (props: IRemovalAlertProps) => {
  const { uiStore } = useContext(StoreContext);
  const theme = uiStore.theme === 'DARK' ? 'bp3-dark' : 'bp3-light';
  return (
    <Alert
      className={theme}
      isOpen={props.isOpen}
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
};

interface IRemovalProps<T> {
  object: T;
  onClose: () => void;
}

export const LocationRemoval = (props: IRemovalProps<ClientLocation>) => (
  <RemovalAlert
    isOpen={true}
    title={`Are you sure you want to delete the location "${props.object.name}"?`}
    information="This will permanently remove the location and all files contained in it from Allusion."
    onCancel={props.onClose}
    onConfirm={() => {
      props.onClose();
      props.object.delete();
    }}
  />
);

export const TagRemoval = (props: IRemovalProps<ClientTag | ClientTagCollection>) => {
  const { uiStore, tagStore } = useContext(StoreContext);
  const { object } = props;
  const tagsToRemove = object.isSelected
    ? uiStore.clientTagSelection
    : object instanceof ClientTagCollection
    ? (object
        .getTagsRecursively()
        .map((t) => tagStore.get(t))
        .filter((t) => t !== undefined) as ClientTag[])
    : [];

  const text = `Are you sure you want to delete the ${
    object instanceof ClientTagCollection ? 'collection' : 'tag'
  } "${object.name}"?`;

  return (
    <RemovalAlert
      isOpen={true}
      title={text}
      information="Deleting tags or collections will permanently remove them from Allusion."
      body={
        tagsToRemove.length > 0 && (
          <div id="tag-remove-overview">
            <p>Selected Tags</p>
            {tagsToRemove.map((tag) => (
              <span key={tag.id}>
                <Tag intent="primary">{tag.name}</Tag>{' '}
              </span>
            ))}
          </div>
        )
      }
      onCancel={props.onClose}
      onConfirm={() => {
        props.onClose();
        object.isSelected ? uiStore.removeSelectedTagsAndCollections() : props.object.delete();
      }}
    />
  );
};

export const FileRemoval = (props: IRemovalProps<ClientFile[]>) => {
  const { fileStore, uiStore } = useContext(StoreContext);
  const { object: files } = props;

  return (
    <RemovalAlert
      isOpen={uiStore.isToolbarFileRemoverOpen}
      title={`Are you sure you want to delete ${files.length} missing file${
        files.length > 1 ? 's' : ''
      }?`}
      information="Deleting files will permanently remove them from Allusion. Accidentially moved files can be recovered by returning them to their previous location."
      onCancel={props.onClose}
      onConfirm={() => {
        props.onClose();
        fileStore.removeFiles(files.map((f) => f.id));
      }}
    />
  );
};
