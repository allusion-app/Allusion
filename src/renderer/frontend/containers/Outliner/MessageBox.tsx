import React, { useContext } from 'react';
import { Alert, Tag } from '@blueprintjs/core';
import IconSet from 'components/Icons';
import { ClientLocation } from 'src/renderer/entities/Location';
import StoreContext from '../../contexts/StoreContext';
import { ClientTagCollection } from 'src/renderer/entities/TagCollection';
import { ClientTag } from 'src/renderer/entities/Tag';

interface IConfirmationProps {
  theme?: string;
  isOpen: boolean;
  confirmButtonText: string;
  onCancel: () => void;
  onConfirm: () => void;
  title: string;
  body: React.ReactNode;
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
    <h4 className="bp3-heading inpectorHeading">{props.title}</h4>
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
    title="Confirm delete"
    body={
      <p>
        Remove {`"${props.object.name}"`} from your locations?
        <br />
        This will remove all files it contains from Allusion.
      </p>
    }
    onCancel={props.onClose}
    onConfirm={async () => {
      await props.object.delete();
      props.onClose();
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
    : [object];

  const text = `Are you sure you want to permanently delete the ${
    object instanceof ClientTagCollection ? 'collection' : 'tag'
  } "${object.name}"?`;

  return (
    <Confirmation
      theme={props.theme}
      icon={IconSet.DELETE}
      isOpen={true}
      confirmButtonText="Delete"
      title="Confirm delete"
      body={
        <>
          <p>{text}</p>
          {tagsToRemove.length > 0 && (
            <div id="tag-remove-overview">
              <p>To be deleted tags:</p>
              {tagsToRemove.map((tag) => (
                <span key={tag.id}>
                  <Tag intent="primary">{tag.name}</Tag>{' '}
                </span>
              ))}
            </div>
          )}
        </>
      }
      onCancel={props.onClose}
      onConfirm={async () => {
        if (object.isSelected) {
          await uiStore.removeSelectedTagsAndCollections();
        } else {
          await props.object.delete();
        }
        props.onClose();
      }}
    ></Confirmation>
  );
};
