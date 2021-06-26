import { observer } from 'mobx-react-lite';
import React from 'react';
import { TooltipLayer } from 'widgets/popovers';
import { useStore } from './contexts/StoreContext';

const Overlay = observer(() => {
  const { uiStore } = useStore();

  return (
    <div className={uiStore.preferences.theme}>
      <TooltipLayer />
    </div>
  );
});

export default Overlay;
