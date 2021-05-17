import React, { useContext, useState } from 'react';
import fse from 'fs-extra';
import { observer } from 'mobx-react-lite';
import Path from 'path';

import { RendererMessenger } from 'src/Messaging';
import { IMG_EXTENSIONS } from 'src/entities/File';
import { ClientLocation } from 'src/entities/Location';
import StoreContext from 'src/frontend/contexts/StoreContext';
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
        <div>The location has been recovered, all files were found in the specified directory!</div>
      );

    case Status.InvalidPath:
      return (
        <div>
          <p>The location {location.name} could not be found on your system.</p>
          <p>
            If it has been moved to a different directory, you can relocate the location by choosing
            its new path to recover information Allusion has stored about your images
          </p>
          <p>Original path:</p>
          <pre>{location.path}</pre>
        </div>
      );

    case Status.NoMatches:
      return (
        <div>
          The location could not be recovered since no images of this location were found in the
          specified directory.
        </div>
      );

    // TODO: Should also warn about new images in the folder that were not in the location before (status.directoryImageCount)
    case Status.PartialRecovery:
      if (match) {
        return (
          <div>
            Only {match.matchCount} out of {match.locationImageCount} images were found in the
            specified directory. By recovering the location, the missing files would be lost. Do you
            still want to recover the location using this directory?
          </div>
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
    const { uiStore } = useContext(StoreContext);

    switch (status) {
      case Status.Ok:
        return (
          <div className="btn-group dialog-actions">
            <Button styling="outlined" onClick={uiStore.closeLocationRecovery} text="Close" />
          </div>
        );

      case Status.InvalidPath:
        return (
          <div className="btn-group dialog-actions">
            <Button styling="filled" onClick={locate} text="Locate" />
            {/* Re-scan option, e.g. for when you mount a drive */}
            <Button styling="outlined" onClick={rescan} text="Re-Scan" />
            <Button styling="outlined" onClick={uiStore.closeLocationRecovery} text="Cancel" />
          </div>
        );

      case Status.NoMatches:
        return (
          <div className="btn-group dialog-actions">
            <Button styling="outlined" onClick={retry} text="Retry" />
          </div>
        );

      case Status.PartialRecovery:
        return (
          <div className="btn-group dialog-actions">
            <Button styling="outlined" onClick={retry} text="Retry" />
            <Button styling="outlined" onClick={save} text="Recover" />
          </div>
        );

      default:
        return (
          <div className="btn-group dialog-actions">
            <Button styling="outlined" onClick={uiStore.closeLocationRecovery} text="Close" />
          </div>
        );
    }
  },
);

const LocationRecoveryDialog = () => {
  const { uiStore, locationStore } = useContext(StoreContext);
  const { isLocationRecoveryOpen } = uiStore;

  const [match, setMatch] = useState<IMatch>();
  const [pickedDir, setPickedDir] = useState<string>();

  const location = isLocationRecoveryOpen ? locationStore.get(isLocationRecoveryOpen) : undefined;

  if (!location) return null;

  const status = statusFromMatch(match);

  const handleChangeLocationPath = async (location: ClientLocation, path: string) => {
    await locationStore.changeLocationPath(location, path);
    // Dismiss the 'Cannot find location' toast if it is still open
    AppToaster.dismiss(`missing-loc-${location.id}`);
    AppToaster.show({ message: `Recovered Location ${path}!`, timeout: 5000 });
    // Refetch files in case some were from this location and could not be found before
    uiStore.refetch();
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
      if (!location.isInitialized) {
        locationStore.initLocation(location);
      } else {
        uiStore.refetch();
      }
      AppToaster.show({ message: `Re-discovered ${location.path}!`, timeout: 5000 });
    } else {
      AppToaster.show({ message: `Location ${location.path} still not found`, timeout: 5000 });
    }
  };

  return (
    <Dialog open={Boolean(location)} labelledby="dialog-title" describedby="dialog-information">
      <span className="dialog-icon">{IconSet.FOLDER_CLOSE}</span>
      <h2 id="dialog-title" className="dialog-title">
        Location &quot;{location.name}&quot; could not be found
      </h2>
      <div id="dialog-information" className="dialog-information">
        <RecoveryInfo location={location} status={status} match={match} />
      </div>
      <div className="dialog-footer">
        <RecoveryActions
          status={status}
          locate={handleLocate}
          rescan={handleRescan}
          retry={() => setMatch(undefined)}
          save={() => {
            handleChangeLocationPath(location, pickedDir!);
            uiStore.closeLocationRecovery();
          }}
        />
      </div>
    </Dialog>
  );
};

export default observer(LocationRecoveryDialog);
