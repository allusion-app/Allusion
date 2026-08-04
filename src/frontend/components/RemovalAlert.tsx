import { action } from 'mobx';
import { observer } from 'mobx-react-lite';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { IconSet, Tag } from 'widgets';
import { Alert, DialogButton } from 'widgets/popovers';
import { RendererMessenger } from '../../ipc/renderer';
import { useStore } from '../contexts/StoreContext';
import { ClientLocation, ClientSubLocation } from '../entities/Location';
import { ClientFileSearchItem } from '../entities/SearchItem';
import { ClientTag } from '../entities/Tag';
import { AppToaster } from './Toaster';

interface IRemovalProps<T> {
  object: T;
  onClose: () => void;
}

export const LocationRemoval = (props: IRemovalProps<ClientLocation>) => {
  const { t } = useTranslation();
  return (
    <RemovalAlert
      open
      title={t('removal.deleteLocation', { name: props.object.name })}
      information={t('removal.deleteLocationInfo')}
      onCancel={props.onClose}
      onConfirm={() => {
        props.onClose();
        props.object.delete();
      }}
    />
  );
};

export const SubLocationExclusion = (props: IRemovalProps<ClientSubLocation>) => {
  const { t } = useTranslation();
  return (
    <Alert
      open
      title={t('removal.excludeDirTitle', { name: props.object.name })}
      icon={IconSet.WARNING}
      type="warning"
      primaryButtonText={t('removal.exclude')}
      defaultButton={DialogButton.PrimaryButton}
      onClick={(button) => {
        if (button !== DialogButton.CloseButton) {
          props.object.toggleExcluded();
        }
        props.onClose();
      }}
    >
      <p>{t('removal.excludeInfo')}</p>
    </Alert>
  );
};

export const TagRemoval = observer((props: IRemovalProps<ClientTag>) => {
  const { uiStore } = useStore();
  const { object } = props;
  const tagsToRemove = Array.from(
    object.isSelected ? uiStore.tagSelection : object.getSubTree(),
    (t) => <Tag key={t.id} text={t.name} color={t.viewColor} />,
  );

  const { t } = useTranslation();
  const text = t('removal.deleteTag', { name: object.name });

  return (
    <RemovalAlert
      open
      title={text}
      information={t('removal.deleteTagInfo')}
      body={
        tagsToRemove.length > 0 && (
          <div id="tag-remove-overview">
            <p>{t('removal.selectedTags')}</p>
            {tagsToRemove}
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

export const FileRemoval = observer(() => {
  const { fileStore, uiStore } = useStore();
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

  const { t } = useTranslation();
  return (
    <RemovalAlert
      open={uiStore.isToolbarFileRemoverOpen}
      title={t('removal.deleteMissingFiles', { count: selection.size })}
      information={t('removal.deleteMissingFilesInfo')}
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

export const MoveFilesToTrashBin = observer(() => {
  const { fileStore, uiStore } = useStore();
  const selection = uiStore.fileSelection;

  const handleConfirm = action(async () => {
    uiStore.closeMoveFilesToTrash();
    const files = [];
    for (const file of selection) {
      // File deletion used to be possible in renderer process, not in new electron version
      // await shell.trashItem(file.absolutePath);
      // https://github.com/electron/electron/issues/29598
      const error = await RendererMessenger.trashFile(file.absolutePath);
      if (!error) {
        files.push(file);
      } else {
        console.warn('Could not move file to trash', file.absolutePath, error);
      }
    }
    fileStore.deleteFiles(files);
    if (files.length !== selection.size) {
      AppToaster.show({
        message: t('removal.someFilesCouldNotBeDeleted'),
        clickAction: {
          onClick: () => RendererMessenger.toggleDevTools(),
          label: t('removal.moreInfo'),
        },
        timeout: 8000,
      });
    }
  });

  const isMulti = selection.size > 1;

  const { t } = useTranslation();
  return (
    <RemovalAlert
      open={uiStore.isMoveFilesToTrashOpen}
      title={t('removal.deleteFiles', { count: selection.size })}
      information={t('removal.deleteFilesInfo', { plural: isMulti ? 'them' : 'it' })}
      body={
        <div className="deletion-confirmation-list">
          {Array.from(selection).map((f) => (
            <div key={f.id}>{f.absolutePath}</div>
          ))}
        </div>
      }
      onCancel={uiStore.closeMoveFilesToTrash}
      onConfirm={handleConfirm}
    />
  );
});

export const SavedSearchRemoval = observer((props: IRemovalProps<ClientFileSearchItem>) => {
  const { searchStore } = useStore();
  const { t } = useTranslation();
  return (
    <RemovalAlert
      open
      title={t('removal.searchItemRemoval')}
      information={t('removal.searchItemRemovalInfo', { name: props.object.name })}
      onCancel={props.onClose}
      onConfirm={() => {
        props.onClose();
        searchStore.remove(props.object);
      }}
    />
  );
});

interface IRemovalAlertProps {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  title: string;
  information: string;
  primaryButtonText?: string;
  body?: React.ReactNode;
}

const RemovalAlert = (props: IRemovalAlertProps) => {
  const { t } = useTranslation();
  return (
    <Alert
      open={props.open}
      title={props.title}
      icon={IconSet.WARNING}
      type="danger"
      primaryButtonText={t('button.delete')}
      defaultButton={DialogButton.PrimaryButton}
      onClick={(button) =>
        button === DialogButton.CloseButton ? props.onCancel() : props.onConfirm()
      }
    >
      <p>{props.information}</p>
      {props.body}
    </Alert>
  );
};
