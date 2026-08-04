import React from 'react';
import { useTranslation } from 'react-i18next';
import { observer } from 'mobx-react-lite';
import { action } from 'mobx';

import { useStore } from 'src/frontend/contexts/StoreContext';
import { IconSet } from 'widgets';
import { Alert, DialogButton } from 'widgets/popovers';

export const ManyOpenExternal = observer(() => {
  const { t } = useTranslation();
  const { uiStore } = useStore();
  const selection = uiStore.fileSelection;

  const handleConfirm = action(() => {
    uiStore.closeManyExternalFiles();
    uiStore.openExternal(false);
  });

  return (
    <Alert
      open={uiStore.isManyExternalFilesOpen}
      title={t('warning.openExternalTitle', { count: selection.size })}
      icon={IconSet.WARNING}
      type="warning"
      primaryButtonText={t('button.confirm')}
      defaultButton={DialogButton.PrimaryButton}
      onClick={(button) => {
        if (button !== DialogButton.CloseButton) {
          handleConfirm();
        }
        uiStore.closeManyExternalFiles();
      }}
    >
      <p>{t('warning.openExternalBody')}</p>
      <div className="deletion-confirmation-list">
        {Array.from(selection).map((f) => (
          <div key={f.id}>{f.absolutePath}</div>
        ))}
      </div>
    </Alert>
  );
});
