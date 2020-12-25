import React, { useState, useCallback, useContext, useEffect } from 'react';
import path from 'path';
import fse from 'fs-extra';

import { RendererMessenger } from 'src/Messaging';
import { DEFAULT_LOCATION_ID } from 'src/entities/Location';

import StoreContext from '../contexts/StoreContext';

import { Button } from 'widgets';
import { Dialog } from 'widgets/popovers';

import LocationsPanel from './Outliner/LocationsPanel';

const Step = (props: { title: string; children: React.ReactNode }) => {
  return (
    <>
      <div className="dialog-icon"></div>
      <h2 id="welcome-title" className="dialog-title">
        {props.title}
      </h2>
      <div id="welcome-step" className="dialog-information">
        {props.children}
      </div>
    </>
  );
};

const WelcomeStep = () => {
  return (
    <Step title="Organising made simple">
      <p>
        Allusion is a tool designed to help you organize your <strong>Visual Library</strong>, so
        you can easily retrieve relevant images throughout your creative process.
      </p>
    </Step>
  );
};

const SetupImportDirStep = ({
  importLocation,
  setImportLocation,
}: {
  importLocation: string;
  setImportLocation: (loc: string) => void;
}) => {
  const browseImportDirectory = useCallback(async () => {
    const { filePaths: dirs } = await RendererMessenger.openDialog({
      properties: ['openDirectory'],
      defaultPath: importLocation,
    });

    if (dirs.length === 0) {
      return;
    }
    const newDir = dirs[0];
    setImportLocation(newDir);
  }, [importLocation, setImportLocation]);

  return (
    <Step title="Setup Import Location">
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

      <fieldset>
        <legend>Choose your default import location</legend>
        <div className="input-file">
          <span className="input input-file-value">{importLocation}</span>
          <Button styling="filled" text="Browse" onClick={browseImportDirectory} />
        </div>
      </fieldset>
    </Step>
  );
};

const InitialLocationsStep = () => {
  return (
    <Step title="Import Images">
      <p>Do you have any images directories that you would like to add to your Locations folder?</p>
      <LocationsPanel />
    </Step>
  );
};

const IntroStep = () => {
  return (
    <Step title="Welcome Tour">
      <p>Woud you like a quick tour to familiarize yourself with Allusion?</p>
    </Step>
  );
};

const NUM_STEPS = 3;

const WelcomeDialog = () => {
  const { locationStore, fileStore } = useContext(StoreContext);
  const [showDialog, setShowDialog] = useState(false);

  const handleClose = useCallback(async () => {
    await locationStore.init();
    const filesFound = await locationStore.watchLocations();
    if (filesFound) {
      fileStore.refetch();
    }
    setShowDialog(false);
  }, [locationStore, fileStore]);

  // Only check on mount whether to show the dialog, when no default directory exists
  useEffect(() => {
    if (locationStore.get(DEFAULT_LOCATION_ID) === undefined) {
      setShowDialog(true);
    }
  }, [locationStore]);

  const [importLocation, setImportLocation] = useState('');

  const [step, setStep] = useState(0);
  const handleNextStep = useCallback(async () => {
    if (step === 0) {
      const picturesPath = await RendererMessenger.getPath('pictures');
      setImportLocation(path.join(picturesPath, 'Allusion'));
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
      open={showDialog}
      labelledby="welcome-title"
      describedby="welcome-step"
      className="bp3-dark allusion-splash-background welcome-dialog"
    >
      {step === 0 && <WelcomeStep />}
      {step === 1 && (
        <SetupImportDirStep importLocation={importLocation} setImportLocation={setImportLocation} />
      )}
      {step === 2 && <InitialLocationsStep />}
      {step === 3 && <IntroStep />}

      <div className="dialog-footer">
        <div className="btn-group dialog-actions">
          <Button onClick={handleClose} disabled={step === 0} text="Skip" styling="outlined" />
          <Button
            styling="filled"
            onClick={handleNextStep}
            text={step !== NUM_STEPS - 1 ? 'Next' : 'Start'}
          />
        </div>
      </div>
    </Dialog>
  );
};

export default WelcomeDialog;
