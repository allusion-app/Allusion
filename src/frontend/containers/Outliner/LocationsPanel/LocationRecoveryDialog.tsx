import React, { useState } from 'react';
import fse from 'fs-extra';
import { observer } from 'mobx-react-lite';
import Path from 'path';

import { RendererMessenger } from 'src/Messaging';
import { IMG_EXTENSIONS } from 'src/entities/File';
import { ClientLocation } from 'src/entities/Location';
import { useStore } from 'src/frontend/contexts/StoreContext';
import LocationStore from 'src/frontend/stores/LocationStore';
import { Button, IconSet } from 'widgets';
import { Dialog } from 'widgets/popovers';
import { AppToaster } from 'src/frontend/components/Toaster';

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
  switch (status) {
    case Status.Ok:
      return (
        <p>The location has been recovered, all files were found in the specified directory!</p>
      );

    case Status.InvalidPath:
      return (
        <>
          <p>The location {location.name} could not be found on your system.</p>
          <p>
            If it has been moved to a different directory, you can relocate the location by choosing
            its new path to recover information Allusion has stored about your images
          </p>
          <p>Original path:</p>
          <pre>{location.path}</pre>
        </>
      );

    case Status.NoMatches:
      return (
        <p>
          The location could not be recovered since no images of this location were found in the
          specified directory.
        </p>
      );

    // TODO: Should also warn about new images in the folder that were not in the location before (status.directoryImageCount)
    case Status.PartialRecovery:
      if (match) {
        return (
          <p>
            Only {match.matchCount} out of {match.locationImageCount} images were found in the
            specified directory. By recovering the location, the missing files would be lost. Do you
            still want to recover the location using this directory?
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

    switch (status) {
      case Status.InvalidPath:
        return (
          <>
            <Button key="locate" styling="filled" onClick={locate} text="Locate" />
            {/* Re-scan option, e.g. for when you mount a drive */}
            <Button key="rescan" styling="outlined" onClick={rescan} text="Re-Scan" />
            <Button
              key="cancel"
              styling="outlined"
              onClick={uiStore.closeLocationRecovery}
              text="Cancel"
            />
          </>
        );

      case Status.NoMatches:
        return (
          <>
            <Button key="retry" styling="outlined" onClick={retry} text="Retry" />
            <Button
              key="cancel"
              styling="filled"
              onClick={uiStore.closeLocationRecovery}
              text="Cancel"
            />
          </>
        );

      case Status.PartialRecovery:
        return (
          <>
            <Button key="retry" styling="outlined" onClick={retry} text="Retry" />
            <Button key="recover" styling="outlined" onClick={save} text="Recover" />
            <Button
              key="cancel"
              styling="filled"
              onClick={uiStore.closeLocationRecovery}
              text="Cancel"
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
            text="Close"
          />
        );
    }
  },
);

const LocationRecoveryDialog = () => {
  const { uiStore, locationStore, fileStore } = useStore();
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
    AppToaster.show({ message: `Recovered Location ${path}!`, timeout: 5000 });
  };

  const handleLocate = async () => {
    const { filePaths: dirs } = await RendererMessenger.openDialog({
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
      title={`Recover Location ${location.name}`}
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
