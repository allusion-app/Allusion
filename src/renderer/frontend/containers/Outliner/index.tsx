import React, { useContext } from 'react';
import { observer } from 'mobx-react-lite';
import { H4 } from '@blueprintjs/core';

import StoreContext from '../../contexts/StoreContext';

import ImportForm from './ImportForm';
import TagPanel from './TagPanel';
import { CanvasScenePanel } from '../../Canvas';

const Outliner = () => {
  const rootStore = useContext(StoreContext);
  const { uiStore } = rootStore;

  // Todo: Use https://blueprintjs.com/docs/#core/components/tabs
  return (
    <nav id="outliner" className={`${uiStore.isOutlinerOpen ? 'outlinerOpen' : ''}`}>
      {uiStore.outlinerPage === 'IMPORT' && (<>
        <H4 className="bp3-heading">Import</H4>
        <ImportForm />
      </>)}

      {uiStore.outlinerPage === 'TAGS' && (<TagPanel />)}

      {uiStore.isCanvasOpen && (<CanvasScenePanel />)}

    </nav>
  );
};

export default observer(Outliner);
