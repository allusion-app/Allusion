import React, { useContext } from 'react';
import { observer } from 'mobx-react-lite';

import StoreContext from '../../contexts/StoreContext';

import TagPanel from './TagPanel';
import LocationsForm from './LocationsForm';

const Outliner = () => {
  const rootStore = useContext(StoreContext);
  const { uiStore } = rootStore;

  // Todo: Use https://blueprintjs.com/docs/#core/components/tabs
  return (
    <nav id="outliner" className={`${uiStore.isOutlinerOpen ? 'outlinerOpen' : ''}`}>
      <LocationsForm />
      <TagPanel />
    </nav>
  );
};

export default observer(Outliner);
