import { observer } from 'mobx-react-lite';
import React, { useEffect, useState } from 'react';
import { RendererMessenger, WindowSystemButtonPress } from 'src/Messaging';
import { IconSet } from 'widgets/Icons';
import { useStore } from '../contexts/StoreContext';
import { IS_MAC } from 'common/process';
import { useAutorun, useComputed } from '../hooks/mobx';

const WindowTitlebar = () => {
  const [isFocused, setIsFocused] = useState(true);

  useEffect(() => {
    const disposeFocusListener = RendererMessenger.onFocus(() => setIsFocused(true));
    const disposeBlurListener = RendererMessenger.onBlur(() => setIsFocused(false));

    return () => {
      disposeFocusListener();
      disposeBlurListener();
    };
  }, []);

  return (
    <div id="window-titlebar" className={isFocused ? undefined : 'inactive'}>
      <div id="window-resize-area" />

      <WindowTitle />

      {!IS_MAC && <WindowSystemButtons />}
    </div>
  );
};

const WindowTitle = observer(() => {
  const { fileStore, uiStore } = useStore();

  const windowTitle = useComputed(() => {
    const activeFile = fileStore.fileIndex.at(uiStore.firstItem);
    if (uiStore.isSlideMode && activeFile !== undefined) {
      return `${activeFile.filename}.${activeFile.extension} - Allusion`;
    } else {
      return 'Allusion';
    }
  });

  useAutorun(() => {
    document.title = windowTitle.get();
  });

  /* Extra span needed for ellipsis; isn't compatible with display: flex */
  return (
    <span>
      <span>{windowTitle.get()}</span>
    </span>
  );
});

export default WindowTitlebar;

const WindowSystemButtons = () => {
  const [isMaximized, setMaximized] = useState(() => RendererMessenger.isMaximized());

  useEffect(() => {
    const disposeUnmaxizeListener = RendererMessenger.onUnmaximize(() => setMaximized(false));
    const disposeMaximizeListener = RendererMessenger.onMaximize(() => setMaximized(true));

    return () => {
      disposeUnmaxizeListener();
      disposeMaximizeListener();
    };
  }, []);

  return (
    <div id="window-system-buttons">
      <button
        onClick={() => RendererMessenger.pressWindowSystemButton(WindowSystemButtonPress.Minimize)}
      >
        {IconSet.CHROME_MINIMIZE}
      </button>
      <button
        onClick={() =>
          RendererMessenger.pressWindowSystemButton(
            isMaximized ? WindowSystemButtonPress.Restore : WindowSystemButtonPress.Maximize,
          )
        }
      >
        {isMaximized ? IconSet.CHROME_RESTORE : IconSet.CHROME_MAXIMIZE}
      </button>
      <button
        onClick={() => RendererMessenger.pressWindowSystemButton(WindowSystemButtonPress.Close)}
      >
        {IconSet.CHROME_CLOSE}
      </button>
    </div>
  );
};
