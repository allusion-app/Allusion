import fse from 'fs-extra';
import { observer } from 'mobx-react-lite';
import Path from 'path';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button, IconSet } from 'widgets';
import { Dialog } from 'widgets/popovers';
import { IMG_EXTENSIONS } from '../../../../api/file';
import { RendererMessenger } from '../../../../ipc/renderer';
import { AppToaster } from '../../../components/Toaster';
import { useStore } from '../../../contexts/StoreContext';
import { ClientLocation } from '../../../entities/Location';
import LocationStore from '../../../stores/LocationStore';

interface IMatch {
  locationImageCount: number;
  directoryImageCount: number;
  matchCount: number;
}

async function findImagesRecursively(path: string): Promise<string[]> {
  try {
    const imgs: string[] = [];
    for (const file of await fse.readdir(path)) {
      const fullPath = Path.join(path, file);
      if ((await fse.stat(fullPath)).isDirectory()) {
        imgs.push(...(await findImagesRecursively(fullPath)));
      } else if (IMG_EXTENSIONS.some((ext) => file.toLowerCase().endsWith(ext))) {
        imgs.push(fullPath);
      }
    }
    return imgs;
  } catch (e) {
    return [];
  }
}

async function doesLocationMatchWithDir(
  loc: ClientLocation,
  dir: string,
  locStore: LocationStore,
): Promise<IMatch> {
  const folderImagePaths = await findImagesRecursively(dir);
  const folderImagePathsRelative = folderImagePaths.map((f) => f.slice(dir.length));

  const locFiles = await locStore.findLocationFiles(loc.id);
  const locImagePathsRelative = locFiles.map((f) => f.relativePath);

  const intersection = folderImagePathsRelative.filter((f) => locImagePathsRelative.includes(f));

  return {
    locationImageCount: locImagePathsRelative.length,
    directoryImageCount: folderImagePaths.length,
    matchCount: intersection.length,
  };
}

enum Status {
  /** The location is in a valid state. */
  Ok,
  /** The path does not exist on the system. This happens when a folder has
   * been (re)moved or an external device was unmounted. */
  InvalidPath,
  /** The chosen path does not contain any matching files. The user should
   * either choose another path or delete the location. */
  NoMatches,
  /** The chosen path only contains some of the old location data. In this case
   * the user has to decide whether the data should be overridden. */
  PartialRecovery,
}

const statusFromMatch = (match: IMatch | undefined): Status => {
  if (match === undefined) {
    return Status.InvalidPath;
  } else if (match.locationImageCount === match.matchCount) {
    return Status.Ok;
  } else if (match.matchCount === 0) {
    return Status.NoMatches;
  } else {
    return Status.PartialRecovery;
  }
};

interface IRecoveryInfoProps {
  location: ClientLocation;
  status: Status;
  match?: IMatch;
}

const RecoveryInfo = observer(({ location, status, match }: IRecoveryInfoProps) => {
  const { t } = useTranslation();
  switch (status) {
    case Status.Ok:
      return <p>{t('outliner.locations.recovery.ok')}</p>;

    case Status.InvalidPath:
      return (
        <>
          <p>{t('outliner.locations.recovery.notFound', { name: location.name })}</p>
          <p>{t('outliner.locations.recovery.explainRelocate')}</p>
          <p>{t('outliner.locations.recovery.originalPath')}</p>
          <pre>{location.path}</pre>
        </>
      );

    case Status.NoMatches:
      return <p>{t('outliner.locations.recovery.noMatches')}</p>;

    // TODO: Should also warn about new images in the folder that were not in the location before (status.directoryImageCount)
    case Status.PartialRecovery:
      if (match) {
        return (
          <p>
            {t('outliner.locations.recovery.partial', {
              match: match.matchCount,
              total: match.locationImageCount,
            })}
          </p>
        );
      }
      return null;

    default:
      return null;
  }
});

interface IRecoveryActionsProps {
  status: Status;
  locate: () => void;
  rescan: () => void;
  retry: () => void;
  save: () => void;
}

const RecoveryActions = observer(
  ({ status, locate, rescan, retry, save }: IRecoveryActionsProps) => {
    const { uiStore } = useStore();
    const { t } = useTranslation();

    switch (status) {
      case Status.InvalidPath:
        return (
          <>
            <Button key="locate" styling="filled" onClick={locate} text={t('button.locate')} />
            {/* Re-scan option, e.g. for when you mount a drive */}
            <Button key="rescan" styling="outlined" onClick={rescan} text={t('button.rescan')} />
            <Button
              key="cancel"
              styling="outlined"
              onClick={uiStore.closeLocationRecovery}
              text={t('button.cancel')}
            />
          </>
        );

      case Status.NoMatches:
        return (
          <>
            <Button key="retry" styling="outlined" onClick={retry} text={t('button.retry')} />
            <Button
              key="cancel"
              styling="filled"
              onClick={uiStore.closeLocationRecovery}
              text={t('button.cancel')}
            />
          </>
        );

      case Status.PartialRecovery:
        return (
          <>
            <Button key="retry" styling="outlined" onClick={retry} text={t('button.retry')} />
            <Button key="recover" styling="outlined" onClick={save} text={t('button.recover')} />
            <Button
              key="cancel"
              styling="filled"
              onClick={uiStore.closeLocationRecovery}
              text={t('button.cancel')}
            />
          </>
        );

      case Status.Ok:
      default:
        return (
          <Button
            key="close"
            styling="filled"
            onClick={uiStore.closeLocationRecovery}
            text={t('button.close')}
          />
        );
    }
  },
);

const LocationRecoveryDialog = () => {
  const { uiStore, locationStore, fileStore } = useStore();
  const { t } = useTranslation();
  const { isLocationRecoveryOpen } = uiStore;

  const [match, setMatch] = useState<IMatch>();
  const [pickedDir, setPickedDir] = useState<string>();

  const location = isLocationRecoveryOpen ? locationStore.get(isLocationRecoveryOpen) : undefined;

  if (!location) {
    return null;
  }

  const status = statusFromMatch(match);

  const handleChangeLocationPath = (location: ClientLocation, path: string) => {
    locationStore.changeLocationPath(location, path);
    AppToaster.show({
      message: t('outliner.locations.recovery.recoveredMessage', { path }),
      timeout: 5000,
    });
  };

  const handleLocate = async () => {
    const { filePaths: dirs } = await RendererMessenger.showOpenDialog({
      properties: ['openDirectory'],
      defaultPath: location.path, // TODO: Maybe pick the parent dir of the original location by default?
    });

    if (dirs.length === 0) {
      return;
    }
    const newDir = dirs[0];

    const match = await doesLocationMatchWithDir(location, newDir, locationStore);

    // Only save the new path if there was a complete match. Otherwise, user can choose what to do
    if (match.matchCount === match.locationImageCount) {
      handleChangeLocationPath(location, newDir);
    }

    setPickedDir(newDir);
    setMatch(match);
  };

  const handleRescan = async () => {
    const exists = await fse.pathExists(location.path);

    if (exists) {
      uiStore.closeLocationRecovery();
      location.setBroken(false);
      if (!location.isInitialized) {
        locationStore.initLocation(location);
      } else {
        fileStore.refetch();
      }
      AppToaster.show({ message: `Re-discovered ${location.path}!`, timeout: 5000 });
    } else {
      AppToaster.show({ message: `Location ${location.path} still not found`, timeout: 5000 });
    }
  };

  return (
    <Dialog
      open
      title={t('outliner.locations.recoverTitle', { name: location.name })}
      icon={IconSet.FOLDER_CLOSE}
      describedby="location-recovery-info"
      onCancel={uiStore.closeLocationRecovery}
    >
      <div id="location-recovery-info">
        <RecoveryInfo location={location} status={status} match={match} />
      </div>
      <div className="dialog-actions">
        <RecoveryActions
          status={status}
          locate={handleLocate}
          rescan={handleRescan}
          retry={() => setMatch(undefined)}
          save={() => {
            if (pickedDir) {
              handleChangeLocationPath(location, pickedDir);
              uiStore.closeLocationRecovery();
            }
          }}
        />
      </div>
    </Dialog>
  );
};

export default observer(LocationRecoveryDialog);
