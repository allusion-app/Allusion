import React, { useState, useCallback, useContext } from 'react';
import { observer } from 'mobx-react-lite';
import { Dialog, Classes, Button, FormGroup, Divider } from '@blueprintjs/core';
import path from 'path';
import fse from 'fs-extra';

import IconSet from './Icons';
import LocationsForm from '../containers/Outliner/LocationsForm';
import { remote } from 'electron';
import StoreContext from '../contexts/StoreContext';
import { RendererMessenger } from '../../../Messaging';
import { DEFAULT_LOCATION_ID } from '../../entities/Location';

// const defaultImportDir = path.join(app.getPath('pictures'), 'Allusion');

const WelcomeDialog = () => {
  const { uiStore, locationStore } = useContext(StoreContext);
  const themeClass = uiStore.theme === 'DARK' ? 'bp3-dark' : 'bp3-light';

  // Show welcome dialog when default location has not been created
  const [showDialog, setShowDialog] = useState(!Boolean(locationStore.get(DEFAULT_LOCATION_ID)));
  const handleClose = useCallback(() => setShowDialog(false), []);

  const [importLocation, setImportLocation] = useState(path.join(RendererMessenger.getUserPicturesPath(), 'Allusion'));
  const browseImportDirectory = useCallback(() => {
    const dirs = remote.dialog.showOpenDialog({
      properties: ['openDirectory'],
      defaultPath: importLocation,
    });

    if (!dirs) {
      return;
    }
    const newDir = dirs[0];
    setImportLocation(newDir);
  }, [importLocation]);

  const handleSubmit = useCallback(async () => {
    // Make directory in case not exists
    fse.ensureDirSync(importLocation);

    // Create the first Location
    await locationStore.addDirectory({ path: importLocation, tagsToAdd: [] }, DEFAULT_LOCATION_ID);

    // Todo: Start tour?
    setShowDialog(false);

  }, [importLocation, locationStore]);

  return (
    <Dialog
      isOpen={showDialog}
      onClose={handleClose}
      icon={IconSet.TAG}
      title="Welcome to Allusion"
      canOutsideClickClose={false}
      canEscapeKeyClose={false}
      className={`${themeClass}`}
    >
      <div className={Classes.DIALOG_BODY}>
        <p>
          <strong>
            Allusion is a tool designed to help you organize your <i>Visual Library</i>,
            so you can easily retrieve relevant images throughout your creative process.
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
          Before setting up your visual library, please choose where you would like
          to store images that you import from external sources:
        </p>
        <p>
          This will be the directory of your default <b>Location</b>.
        </p>

        <FormGroup label="Import location">
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

        <Divider />

        <p>
          Do you have any existing directories containing images that you would like to add as
          Locations to your visual library?
        </p>
        
        <Divider />

        <LocationsForm />

        <br />
        <p>
          Woud you like a quick tour to familiarize yourself with Allusion?
        </p>
      </div>

      <div className={Classes.DIALOG_FOOTER}>
        <div className={Classes.DIALOG_FOOTER_ACTIONS}>
            <Button onClick={handleClose} disabled>Skip</Button>
            <Button intent="primary" onClick={handleSubmit}>
              Start
            </Button>
        </div>
      </div>
    </Dialog>
  )
};

export default observer(WelcomeDialog);
