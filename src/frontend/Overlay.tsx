import { observer } from 'mobx-react-lite';
import React from 'react';
import { TooltipLayer } from 'widgets/popovers';
import { useStore } from './contexts/StoreContext';

const Overlay = observer(({ document = window.document }: { document?: Document }) => {
  const { uiStore } = useStore();

  return (
    <div className={uiStore.theme}>
      <TooltipLayer document={document} />
    </div>
  );
});

export default Overlay;
