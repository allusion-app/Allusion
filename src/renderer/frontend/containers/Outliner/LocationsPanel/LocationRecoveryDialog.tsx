import { Callout } from '@blueprintjs/core';
import { remote } from 'electron';
import fse from 'fs-extra';
import { observer } from 'mobx-react-lite';
import Path from 'path';
import React, { useContext, useState } from 'react';
import { IMG_EXTENSIONS } from 'src/renderer/entities/File';
import { ClientLocation } from 'src/renderer/entities/Location';
import StoreContext from 'src/renderer/frontend/contexts/StoreContext';
import LocationStore from 'src/renderer/frontend/stores/LocationStore';
import IconSet from 'components/Icons';
import { Button, ButtonGroup, Dialog } from 'components';
import { AppToaster } from 'src/renderer/frontend/App';

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
        <Callout intent="success">
          The location has been recovered, all files were found in the specified directory!
        </Callout>
      );

    case Status.InvalidPath:
      return (
        <span>
          <p>The location {location.name} could not be found on your system.</p>
          <p>
            If it has been moved to a different directory, you can relocate the location by choosing
            its new path to recover information Allusion has stored about your images
          </p>
          <p>Original path:</p>
          <pre>{location.path}</pre>
        </span>
      );

    case Status.NoMatches:
      return (
        <Callout intent="danger">
          The location could not be recovered since no images of this location were found in the
          specified directory.
        </Callout>
      );

    // TODO: Should also warn about new images in the folder that were not in the location before (status.directoryImageCount)
    case Status.PartialRecovery:
      if (match) {
        return (
          <Callout intent="warning">
            Only {match.matchCount} out of {match.locationImageCount} images were found in the
            specified directory. By recovering the location, the missing files would be lost. Do you
            still want to recover the location using this directory?
          </Callout>
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
        // TODO: Refetch on close?
        return (
          <ButtonGroup className="dialog-actions">
            <Button styling="outlined" onClick={uiStore.closeLocationRecovery} text="Close" />
          </ButtonGroup>
        );

      case Status.InvalidPath:
        return (
          <ButtonGroup className="dialog-actions">
            <Button styling="filled" onClick={locate} text="Locate" />
            {/* Re-scan option, e.g. for when you mount a drive */}
            <Button styling="outlined" onClick={rescan} text="Re-Scan" />
            <Button styling="outlined" onClick={uiStore.closeLocationRecovery} text="Cancel" />
          </ButtonGroup>
        );

      case Status.NoMatches:
        return (
          <ButtonGroup className="dialog-actions">
            <Button styling="outlined" onClick={retry} text="Retry" />
          </ButtonGroup>
        );

      case Status.PartialRecovery:
        return (
          <ButtonGroup className="dialog-actions">
            <Button styling="outlined" onClick={retry} text="Retry" />
            <Button styling="outlined" onClick={save} text="Recover" />
          </ButtonGroup>
        );

      default:
        return (
          <ButtonGroup className="dialog-actions">
            <Button styling="outlined" onClick={uiStore.closeLocationRecovery} text="Close" />
          </ButtonGroup>
        );
    }
  },
);

const LocationRecoveryDialog = () => {
  const { uiStore, locationStore, fileStore } = useContext(StoreContext);
  const { isLocationRecoveryOpen } = uiStore;

  const [match, setMatch] = useState<IMatch>();
  const [pickedDir, setPickedDir] = useState<string>();

  const location = isLocationRecoveryOpen ? locationStore.get(isLocationRecoveryOpen) : undefined;

  if (!location) return null;

  const status = statusFromMatch(match);

  const handleChangeLocationPath = (location: ClientLocation, path: string) => {
    location.changePath(path);
    AppToaster.show({ intent: 'success', message: `Recovered Location ${path}!` });
  };

  const handleLocate = async () => {
    const dirs = remote.dialog.showOpenDialogSync({
      properties: ['openDirectory'],
      defaultPath: location.path, // TODO: Maybe pick the parent dir of the original location by default?
    });

    if (!dirs) {
      return setMatch(undefined);
    }
    const newDir = dirs[0];

    const match = await doesLocationMatchWithDir(location, newDir, locationStore);

    if (match.locationImageCount > 0 && match.matchCount === match.locationImageCount) {
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
        locationStore.initializeLocation(location);
      } else {
        fileStore.refetch();
      }
      AppToaster.show({ intent: 'success', message: `Re-discovered ${location.path}!` });
    } else {
      AppToaster.show({ intent: 'warning', message: `Location ${location.path} still not found` });
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
      <div className="footer">
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
