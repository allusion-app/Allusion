import React, { useState, useCallback, useContext, useEffect } from 'react';
import { observer } from 'mobx-react-lite';
import { Dialog, Classes, Button, FormGroup, Divider } from '@blueprintjs/core';
import path from 'path';
import fse from 'fs-extra';

import IconSet from 'components/Icons';
import LocationsForm from '../containers/Outliner/LocationsForm';
import { remote } from 'electron';
import StoreContext from '../contexts/StoreContext';
import { RendererMessenger } from '../../../Messaging';
import { DEFAULT_LOCATION_ID } from '../../entities/Location';

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
      <p>
        <strong>
          Allusion is a tool designed to help you organize your <i>Visual Library</i>, so you can
          easily retrieve relevant images throughout your creative process.
        </strong>
      </p>

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
      <p>
        Do you have any existing directories containing images that you would like to add as
        Locations to your visual library?
      </p>

      <Divider />

      <LocationsForm />
    </>
  );
};

const NUM_STEPS = 3;

const WelcomeDialog = () => {
  const { uiStore, locationStore } = useContext(StoreContext);
  const themeClass = uiStore.theme === 'DARK' ? 'bp3-dark' : 'bp3-light';

  const [showDialog, setShowDialog] = useState(false);
  const handleClose = useCallback(() => setShowDialog(false), []);

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
      // Make directory in case not exists
      fse.ensureDirSync(importLocation);

      // Create the first Location
      await locationStore.setDefaultLocation(importLocation);

      setStep(step + 1);
    } else if (step === 1) {
      setStep(step + 1);
    } else if (step === 2) {
      setShowDialog(false);
      // TODO: Start tour here
    }
  }, [importLocation, locationStore, step]);

  return (
    <Dialog
      isOpen={showDialog}
      onClose={handleClose}
      icon={IconSet.TAG}
      title="Welcome to Allusion"
      canOutsideClickClose={false}
      canEscapeKeyClose={false}
      className={`${themeClass}`}
      isCloseButtonShown={false}
      style={{ minHeight: '50vh' }}
    >
      <div className={Classes.DIALOG_BODY}>
        {step === 0 && (
          <SetupImportDirStep
            importLocation={importLocation}
            setImportLocation={setImportLocation}
          />
        )}
        {step === 1 && <InitialLocationsStep />}
        {step === 2 && <p>Woud you like a quick tour to familiarize yourself with Allusion?</p>}
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
    </Dialog>
  );
};

export default observer(WelcomeDialog);
