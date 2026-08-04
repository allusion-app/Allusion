import { observer } from 'mobx-react-lite';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import PopupWindow from '../../components/PopupWindow';
import { useStore } from '../../contexts/StoreContext';
import { Advanced } from './Advanced';
import { Appearance } from './Appearance';
import { BackgroundProcesses } from './BackgroundProcesses';
import { General } from './General';
import { ImageFormatPicker } from './ImageFormatPicker';
import { ImportExport } from './ImportExport';
import { Language } from './Language';
import { Shortcuts } from './Shortcuts';

const Settings = () => {
  const { uiStore } = useStore();

  if (!uiStore.isSettingsOpen) {
    return null;
  }

  return (
    <PopupWindow
      onClose={uiStore.closeSettings}
      windowName="settings"
      closeOnEscape
      additionalCloseKey={uiStore.hotkeyMap.toggleSettings}
    >
      <div id="settings" className={uiStore.theme}>
        <Tabs />
      </div>
    </PopupWindow>
  );
};

export default observer(Settings);

type TabItem = {
  label: string;
  content: () => JSX.Element;
};

const Tabs = () => {
  const { t } = useTranslation();

  const SETTINGS_TABS: TabItem[] = [
    {
      label: t('settings.tabs.general'),
      content: General,
    },
    {
      label: t('settings.tabs.appearance'),
      content: Appearance,
    },
    {
      label: t('settings.tabs.language'),
      content: Language,
    },
    {
      label: t('settings.tabs.keyboardShortcuts'),
      content: Shortcuts,
    },
    {
      label: t('settings.tabs.imageFormats'),
      content: ImageFormatPicker,
    },
    {
      label: t('settings.tabs.importExport'),
      content: ImportExport,
    },
    {
      label: t('settings.tabs.backgroundProcesses'),
      content: BackgroundProcesses,
    },
    {
      label: t('settings.tabs.advanced'),
      content: Advanced,
    },
  ];

  const [selection, setSelection] = useState(0);

  const handleKeydown = (event: React.KeyboardEvent) => {
    if (event.key === 'ArrowDown') {
      setSelection((id) => Math.min(id + 1, SETTINGS_TABS.length - 1));
    } else if (event.key === 'ArrowUp') {
      setSelection((id) => Math.max(id - 1, 0));
    }
  };
  return (
    <div className="tabs">
      <div
        role="tablist"
        aria-orientation="vertical"
        aria-label="Settings"
        onKeyDownCapture={handleKeydown}
      >
        {SETTINGS_TABS.map(({ label }, id) => (
          <Tab
            key={id}
            id={id}
            isSelected={id === selection}
            setSelection={setSelection}
            label={label}
          />
        ))}
      </div>
      {SETTINGS_TABS.map((item, id) => (
        <Tabpanel key={id} id={id} isSelected={id === selection} content={item} />
      ))}
    </div>
  );
};

type TabProps = {
  id: number;
  isSelected: boolean;
  setSelection: (id: number) => void;
  label: string | JSX.Element;
};

const Tab = ({ id, isSelected, setSelection, label }: TabProps) => {
  return (
    <button
      role="tab"
      id={`settings_tab_${id}`}
      aria-controls={`settings_tabpanel_${id}`}
      aria-selected={isSelected}
      tabIndex={isSelected ? 0 : -1}
      onClick={() => setSelection(id)}
    >
      {label}
    </button>
  );
};

type TabpanelProps = {
  id: number;
  isSelected: boolean;
  content: TabItem;
};

const Tabpanel = ({ id, isSelected, content: { label, content: Content } }: TabpanelProps) => {
  return (
    <div
      role="tabpanel"
      style={isSelected ? undefined : { display: 'none' }}
      id={`settings_tabpanel_${id}`}
      aria-labelledby={`settings_tab_${id}`}
    >
      <h2>{label}</h2>
      <Content />
    </div>
  );
};
