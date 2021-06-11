import { observer } from 'mobx-react-lite';
import React, { useContext } from 'react';
import { TooltipLayer } from 'widgets/popovers';
import StoreContext from './contexts/StoreContext';

const Overlay = observer(() => {
  const { uiStore } = useContext(StoreContext);

  return (
    <div className={uiStore.theme}>
      <TooltipLayer />
    </div>
  );
});

export default Overlay;
