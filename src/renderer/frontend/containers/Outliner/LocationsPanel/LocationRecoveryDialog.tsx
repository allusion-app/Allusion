import { Button, ButtonGroup, Callout, Classes, Dialog } from '@blueprintjs/core';
import { remote } from 'electron';
import fse from 'fs-extra';
import { observer } from 'mobx-react-lite';
import Path from 'path';
import React, { useCallback, useContext, useState } from 'react';
import { IMG_EXTENSIONS } from 'src/renderer/entities/File';
import { ClientLocation } from 'src/renderer/entities/Location';
import StoreContext from 'src/renderer/frontend/contexts/StoreContext';
import LocationStore from 'src/renderer/frontend/stores/LocationStore';
import IconSet from 'components/Icons';
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

const LocationRecoveryDialog = ({ onDelete }: { onDelete: (loc: ClientLocation) => void }) => {
  const { uiStore, locationStore, fileStore } = useContext(StoreContext);
  const theme = uiStore.theme === 'DARK' ? 'bp3-dark' : 'bp3-light';
  const { isLocationRecoveryOpen } = uiStore;

  const [status, setStatus] = useState<IMatch>();
  const [pickedDir, setPickedDir] = useState<string>();

  const handleChangeLocationPath = useCallback((location: ClientLocation, path: string) => {
    location.changePath(path);
    AppToaster.show({ intent: 'success', message: `Recovered Location ${path}!` });
  }, []);

  const handleRecover = useCallback(async () => {
    setStatus(undefined);

    const location = locationStore.get(isLocationRecoveryOpen!)!;

    const dirs = remote.dialog.showOpenDialogSync({
      properties: ['openDirectory'],
      defaultPath: location.path, // TODO: Maybe pick the parent dir of the original location by default?
    });

    if (!dirs) {
      return;
    }
    const newDir = dirs[0];

    const match = await doesLocationMatchWithDir(location, newDir, locationStore);

    if (match.locationImageCount > 0 && match.matchCount === match.locationImageCount) {
      handleChangeLocationPath(location, newDir);
    }

    setPickedDir(newDir);
    setStatus(match);
  }, [handleChangeLocationPath, isLocationRecoveryOpen, locationStore]);

  const handleRescan = useCallback(async () => {
    // Check if folder is there, close if found, show :( when not
    const location = locationStore.get(isLocationRecoveryOpen!)!;

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
  }, [fileStore, isLocationRecoveryOpen, locationStore, uiStore]);

  if (!isLocationRecoveryOpen) return <></>;

  const location = locationStore.get(isLocationRecoveryOpen);
  if (!location) return <></>;

  const noRecovery = status && status.matchCount === 0;
  const fullRecovery = status && !noRecovery && status.locationImageCount === status.matchCount;
  const partialRecovery = status && !noRecovery && status.matchCount < status.locationImageCount;

  // TODO: Should also warn about new images in the folder that were not in the location before (status.directoryImageCount)
  return (
    <Dialog
      title={
        <span className="ellipsis" title={location.path}>
          Location &quot;{location.name}&quot; could not be found
        </span>
      }
      icon={IconSet.FOLDER_CLOSE}
      isOpen={Boolean(location)}
      onClose={uiStore.closeLocationRecovery}
      className={theme}
    >
      <div className={Classes.DIALOG_BODY}>
        {!status ? (
          <span>
            <p>The location {location.name} could not be found on your system.</p>
            <p>
              If it has been moved to a different directory, you can relocate the location by
              choosing its new path to recover information Allusion has stored about your images
            </p>
            <p>Original path:</p>
            <pre>{location.path}</pre>
          </span>
        ) : (
          <span>
            {fullRecovery && (
              <Callout intent="success">
                The location has been recovered, all files were found in the specified directory!
                <br />
                <br />
                <Button onClick={uiStore.closeLocationRecovery}>Close</Button>
                {/* TODO: Refetch on close? */}
              </Callout>
            )}
            {noRecovery && (
              <Callout intent="danger">
                The location could not be recovered since no images of this location were found in
                the specified directory.
                <br />
                <br />
                <Button onClick={() => setStatus(undefined)}>Retry</Button>
              </Callout>
            )}
            {partialRecovery &&
              (location.path === pickedDir ? (
                <Callout intent="success">
                  The location has been recovered!
                  <br />
                  <br />
                  <Button onClick={uiStore.closeLocationRecovery}>Close</Button>
                </Callout>
              ) : (
                <Callout intent="warning">
                  Only {status.matchCount} out of {status.locationImageCount} images were found in
                  the specified directory. By recovering the location, the missing files would be
                  lost. Do you still want to recover the location using this directory?
                  <br />
                  <br />
                  <Button onClick={() => setStatus(undefined)}>Retry</Button>
                  <Button
                    onClick={() =>
                      void uiStore.closeLocationRecovery() ||
                      handleChangeLocationPath(location, pickedDir!)
                    }
                    intent="warning"
                  >
                    Recover
                  </Button>
                </Callout>
              ))}
          </span>
        )}
      </div>

      {!status && (
        <div className={Classes.DIALOG_FOOTER}>
          <div className={Classes.DIALOG_FOOTER_ACTIONS}>
            <ButtonGroup>
              {/* Re-scan option, e.g. for when you mount a drive */}
              <Button intent="none" onClick={handleRescan}>
                Re-scan
              </Button>
              <Button intent="primary" onClick={handleRecover}>
                Relocate
              </Button>
              <Button
                intent="danger"
                onClick={() => void uiStore.closeLocationRecovery() || onDelete(location)}
              >
                Delete
              </Button>
              <Button onClick={uiStore.closeLocationRecovery}>Cancel</Button>
            </ButtonGroup>
          </div>
        </div>
      )}
    </Dialog>
  );
};

export default observer(LocationRecoveryDialog);
