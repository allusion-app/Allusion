import React, { useState, useCallback, useContext, useEffect } from 'react';
import { observer } from 'mobx-react-lite';
import { Dialog, Classes, Button, FormGroup } from '@blueprintjs/core';
import path from 'path';
import fse from 'fs-extra';

import IconSet from 'components/Icons';
import LocationsPanel from '../containers/Outliner/LocationsPanel';
import { remote } from 'electron';
import StoreContext from '../contexts/StoreContext';
import { RendererMessenger } from '../../../Messaging';
import { DEFAULT_LOCATION_ID } from '../../entities/Location';

const WelcomeStep = () => {
  return (
    <>
      <span className="logo-welcome"></span>
      <h3>Organising made simple</h3>
      <p>
        Allusion is a tool designed to help you organize your <strong>Visual Library</strong>, so
        you can easily retrieve relevant images throughout your creative process.
      </p>
    </>
  );
};

const SetupImportDirStep = ({
  importLocation,
  setImportLocation,
}: {
  importLocation: string;
  setImportLocation: (loc: string) => void;
}) => {
  const browseImportDirectory = useCallback(() => {
    const dirs = remote.dialog.showOpenDialogSync({
      properties: ['openDirectory'],
      defaultPath: importLocation,
    });

    if (!dirs) {
      return;
    }
    const newDir = dirs[0];
    setImportLocation(newDir);
  }, [importLocation, setImportLocation]);

  return (
    <>
      <span className="logo-welcome"></span>
      <h3>Import location</h3>
      {/*
       * Add files by
       * - Adding a location - files added to that folder will automatically show up in Allusion
       * - Drag and drop images from your file explorer or browser to copy them into your Import Location
       * - Use the Allusion Chrome Extension to download, even when Allusion is running in the background
       */}

      {/* Todo: Would be nicer to do in steps (cards sliding (NEXT -> NEXT -> Start tour)) */}
      <p>
        Before setting up your visual library, please choose where you would like to store images
        that you import from external sources:
      </p>
      <p>
        This will be the directory of your default <b>Location</b>.
      </p>

      {/* TODO: Maybe simplify text to: "Where would you like to store new images by default?" */}

      <FormGroup>
        <label
          className={`${Classes.FILL} ${Classes.FILE_INPUT} ${Classes.FILE_INPUT_HAS_SELECTION}`}
          htmlFor="importPathInput"
        >
          <span
            className={Classes.FILE_UPLOAD_INPUT}
            id="importPathInput"
            onClick={browseImportDirectory}
            title={importLocation}
          >
            {importLocation}
          </span>
        </label>
      </FormGroup>
    </>
  );
};

const InitialLocationsStep = () => {
  return (
    <>
      <span className="logo-welcome"></span>
      <h3>Import images</h3>
      <p>Do you have any images directories that you would like to add to your Locations folder?</p>

      <LocationsPanel />
    </>
  );
};

const IntroStep = () => {
  return (
    <>
      <span className="logo-welcome"></span>
      <h3>Import images</h3>
      <p>Woud you like a quick tour to familiarize yourself with Allusion?</p>
    </>
  );
};
const NUM_STEPS = 3;

const WelcomeDialog = () => {
  const { uiStore, locationStore, fileStore } = useContext(StoreContext);
  const themeClass = uiStore.theme === 'DARK' ? 'bp3-dark' : 'bp3-light';
  const [showDialog, setShowDialog] = useState(false);

  const handleClose = useCallback(async () => {
    await locationStore.init(true);
    fileStore.refetch();
    setShowDialog(false);
  }, [locationStore, fileStore]);

  // Only check on mount whether to show the dialog, when no default directory exists
  useEffect(() => {
    if (!Boolean(locationStore.get(DEFAULT_LOCATION_ID))) {
      setShowDialog(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [importLocation, setImportLocation] = useState(
    path.join(RendererMessenger.getUserPicturesPath(), 'Allusion'),
  );

  const [step, setStep] = useState(0);
  const handleNextStep = useCallback(async () => {
    if (step === 0) {
      setStep(step + 1);
    } else if (step === 1) {
      // Make directory in case not exists
      fse.ensureDirSync(importLocation);

      // Create the first Location
      await locationStore.setDefaultLocation(importLocation);
      setStep(step + 1);
    } else if (step === 2) {
      setStep(step + 1);
    } else if (step === 3) {
      setShowDialog(false);
      handleClose();
      // TODO: Start tour here
    }
  }, [handleClose, importLocation, locationStore, step]);

  return (
    <Dialog
      isOpen={showDialog}
      onClose={handleClose}
      icon={IconSet.TAG}
      title="Welcome to Allusion"
      canOutsideClickClose={false}
      canEscapeKeyClose={false}
      className={`${themeClass} welcomedialog`}
      isCloseButtonShown={false}
    >
      <div className={Classes.DIALOG_BODY}>
        {step === 0 && <WelcomeStep />}
        {step === 1 && (
          <SetupImportDirStep
            importLocation={importLocation}
            setImportLocation={setImportLocation}
          />
        )}
        {step === 2 && <InitialLocationsStep />}
        {step === 3 && <IntroStep />}
      </div>

      <div className={Classes.DIALOG_FOOTER}>
        <div className={Classes.DIALOG_FOOTER_ACTIONS}>
          <Button onClick={handleClose} disabled={step === 0}>
            Skip
          </Button>
          <Button intent="primary" onClick={handleNextStep}>
            {step !== NUM_STEPS - 1 ? 'Next' : 'Start'}
          </Button>
        </div>
      </div>
      <div className={'grad'}></div>
      <div className={'welcome'}></div>
    </Dialog>
  );
};

export default observer(WelcomeDialog);
