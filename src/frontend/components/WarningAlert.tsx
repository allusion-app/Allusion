import React from 'react';
import { observer } from 'mobx-react-lite';
import { action } from 'mobx';

import { useStore } from 'src/frontend/contexts/StoreContext';
import { IconSet } from 'widgets';
import { Alert, DialogButton } from 'widgets/popovers';

export const ManyOpenExternal = observer(() => {
  const { uiStore } = useStore();
  const selection = uiStore.fileSelection;

  const handleConfirm = action(() => {
    uiStore.closeManyExternalFiles();
    uiStore.openExternal(false);
  });

  return (
    <Alert
      open={uiStore.isManyExternalFilesOpen}
      title={`Are you sure you want to open ${selection.size} images in their default application?`}
      icon={IconSet.WARNING}
      type="warning"
      primaryButtonText="Confirm"
      defaultButton={DialogButton.PrimaryButton}
      onClick={(button) => {
        if (button !== DialogButton.CloseButton) {
          handleConfirm();
        }
        uiStore.closeManyExternalFiles();
      }}
    >
      <p>This may severely slow down your computer, to the point of it becoming unresponsive.</p>
      <div className="deletion-confirmation-list">
        {Array.from(selection).map((f) => (
          <div key={f.id}>{f.absolutePath}</div>
        ))}
      </div>
    </Alert>
  );
});
