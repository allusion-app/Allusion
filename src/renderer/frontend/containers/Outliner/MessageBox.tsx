import React, { useContext } from 'react';
import { Alert, Tag } from '@blueprintjs/core';
import IconSet from 'components/Icons';
import { ClientLocation } from 'src/renderer/entities/Location';
import StoreContext from '../../contexts/StoreContext';
import { ClientTagCollection } from 'src/renderer/entities/TagCollection';
import { ClientTag } from 'src/renderer/entities/Tag';
import { ClientFile } from 'src/renderer/entities/File';

interface IConfirmationProps {
  theme?: string;
  isOpen: boolean;
  confirmButtonText: string;
  onCancel: () => void;
  onConfirm: () => void;
  title: string;
  information?: string;
  body?: React.ReactNode;
  icon?: JSX.Element;
}

const Confirmation = (props: IConfirmationProps) => (
  <Alert
    isOpen={props.isOpen}
    cancelButtonText="Cancel"
    confirmButtonText={props.confirmButtonText}
    icon={props.icon}
    intent="danger"
    canEscapeKeyCancel
    canOutsideClickCancel
    onCancel={props.onCancel}
    onConfirm={props.onConfirm}
    className={props.theme}
  >
    <strong>{props.title}</strong>
    <p>{props.information}</p>
    {props.body}
  </Alert>
);

interface IRemovalProps<T> {
  theme: string;
  object: T;
  onClose: () => void;
}

export const LocationRemoval = (props: IRemovalProps<ClientLocation>) => (
  <Confirmation
    theme={props.theme}
    icon={IconSet.DELETE}
    isOpen={true}
    confirmButtonText="Delete"
    title={`Are you sure you want to delete the location "${props.object.name}"?`}
    information="This will permanently remove the location and all files contained in it from Allusion."
    onCancel={props.onClose}
    onConfirm={() => {
      props.onClose();
      props.object.delete();
    }}
  ></Confirmation>
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
    <Confirmation
      theme={props.theme}
      icon={IconSet.DELETE}
      isOpen={true}
      confirmButtonText="Delete"
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
    ></Confirmation>
  );
};

export const FileRemoval = (
  props: IRemovalProps<ClientFile[]> & Pick<IConfirmationProps, 'isOpen'>,
) => {
  const { fileStore } = useContext(StoreContext);
  const { object: files } = props;

  return (
    <Confirmation
      theme={props.theme}
      icon={IconSet.DELETE}
      isOpen={props.isOpen}
      confirmButtonText="Delete"
      title={`Are you sure you want to delete ${files.length} missing file${
        files.length > 1 ? 's' : ''
      }?`}
      information="Deleting files will permanently remove them from Allusion. If you just accidentially moved files (to the trash bin), you can recover them by moving them back to their previous location and refresh Allusion."
      onCancel={props.onClose}
      onConfirm={() => {
        props.onClose();
        fileStore.removeFiles(files.filter((f) => f.isBroken).map((f) => f.id));
      }}
    />
  );
};
