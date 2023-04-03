import { observer } from 'mobx-react-lite';
import React, { ReactNode, useRef, useState } from 'react';
import PopupWindow from '../../components/PopupWindow';
import { useStore } from '../../contexts/StoreContext';
import { Advanced } from './Advanced';
import { Appearance } from './Appearance';
import { BackgroundProcesses } from './BackgroundProcesses';
import { ImageFormatPicker } from './ImageFormatPicker';
import { ImportExport } from './ImportExport';
import { Shortcuts } from './Shortcuts';
import { StartupBehavior } from './StartupBehavior';

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
        <Tabs initTabItems={SETTINGS_TABS} />
      </div>
    </PopupWindow>
  );
};

export default observer(Settings);

const SETTINGS_TABS: () => TabItem[] = () => [
  {
    label: 'Appearance',
    content: <Appearance />,
  },
  {
    label: 'Keyboard Shortcuts',
    content: <Shortcuts />,
  },
  {
    label: 'Startup Behavior',
    content: <StartupBehavior />,
  },
  {
    label: 'Image Formats',
    content: <ImageFormatPicker />,
  },
  {
    label: 'Import/Export',
    content: <ImportExport />,
  },
  {
    label: 'Background Processes',
    content: <BackgroundProcesses />,
  },
  {
    label: 'Advanced',
    content: <Advanced />,
  },
];

export type TabItem = {
  label: string;
  content: ReactNode;
};

interface ITabs {
  initTabItems: () => TabItem[];
}

const Tabs = ({ initTabItems }: ITabs) => {
  const [selection, setSelection] = useState(0);
  const items = useRef(initTabItems()).current;

  return (
    <div className="tabs">
      <div role="tablist">
        {items.map((item, index) => (
          <button
            role="tab"
            key={item.label}
            aria-selected={index === selection}
            onClick={() => setSelection(index)}
          >
            {item.label}
          </button>
        ))}
      </div>
      <div role="tabpanel">{items[selection].content}</div>
    </div>
  );
};
