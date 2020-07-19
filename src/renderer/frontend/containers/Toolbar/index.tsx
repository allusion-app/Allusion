import React, { useContext, useCallback, useEffect, useState } from 'react';
import { Button, ButtonGroup } from '@blueprintjs/core';
import { observer } from 'mobx-react-lite';

import StoreContext from '../../contexts/StoreContext';
import IconSet from 'components/Icons';
import ContentToolbar from './ContentToolbar';
import { BrowserWindow, webContents, remote } from 'electron';


const isMac = process.platform === 'darwin';

// Tooltip info
export const enum ToolbarTooltips {
  Add = 'Toggle Add Panel',
  Outliner = 'Toggle Outliner',
  Search = 'Toggle Search Panel',
  Media = 'Number of files in library',
  Select = 'Selects or deselects all images',
  TagFiles = 'Quick add or delete tags to selection',
  Delete = 'Delete selection from library',
  View = 'Change view content panel',
  ViewGrid = 'Change view to Grid',
  ViewList = 'Change view List',
  Filter = 'Filter view content panel',
  Inspector = 'Toggle Inspector',
  Settings = 'Toggle Settings',
  HelpCenter = 'Toggle Help Center',
  Back = 'Back to Content panel',
  Preview = 'Open selected images in a preview window',
}

const OutlinerToolbar = observer(() => {
  const { uiStore } = useContext(StoreContext);
  return (
    <section id="outliner-toolbar">
      <ButtonGroup minimal>
        <Button
          icon={IconSet.OUTLINER}
          onClick={uiStore.toggleOutliner}
          intent={uiStore.isOutlinerOpen ? 'primary' : 'none'}
          className="tooltip"
          data-right={ToolbarTooltips.Outliner}
        />
        <Button
          icon={IconSet.INFO}
          onClick={uiStore.toggleInspector}
          intent={uiStore.isInspectorOpen ? 'primary' : 'none'}
          className="tooltip"
          data-right={ToolbarTooltips.Inspector}
        />
        <Button
          icon={IconSet.PREVIEW}
          onClick={uiStore.openPreviewWindow}
          intent={uiStore.isPreviewOpen ? 'primary' : 'none'}
          className="tooltip"
          data-right={`${ToolbarTooltips.Preview} (${uiStore.hotkeyMap.openPreviewWindow})`}
          disabled={uiStore.fileSelection.length === 0}
        />
      </ButtonGroup>
    </section>
  );
});

interface IInspectorToolbar {
  toggleSettings: () => void;
  toggleHelpCenter: () => void;
}

const InspectorToolbar = observer(({ toggleSettings, toggleHelpCenter }: IInspectorToolbar) => {
  return (
    <section id="inspector-toolbar">
      <ButtonGroup minimal>
        <Button
          icon={IconSet.SETTINGS}
          onClick={toggleSettings}
          className="tooltip"
          data-left={ToolbarTooltips.Settings}
        />
        <Button
          icon={IconSet.OPEN_EXTERNAL}
          onClick={toggleHelpCenter}
          className="tooltip"
          data-left={ToolbarTooltips.HelpCenter}
        />
      </ButtonGroup>
    </section>
  );
});

const WindowsButtonCodes = {
  Minimize: <>&#xE921;</>,
  Maximize: <>&#xE922;</>,
  Restore: <>&#xE923;</>,
  Close: <>&#xE8BB;</>,
}

const WindowsSystemButtons = () => {
  const [isMaximized, setMaximized] = useState(remote.getCurrentWindow().isMaximized());
  useEffect(() => {
    remote.getCurrentWindow().on('maximize', () => setMaximized(true));
    remote.getCurrentWindow().on('unmaximize', () => setMaximized(false));
  }, []);

  const handleMinimize = useCallback(() => remote.getCurrentWindow().minimize(), []);
  const handleMaximize = useCallback(() => {
    if (remote.getCurrentWindow().isMaximized()) {
      remote.getCurrentWindow().restore();
      setMaximized(false);
    } else {
      remote.getCurrentWindow().maximize(),
      setMaximized(true);
    }
  }, []);
  const handleClose = useCallback(() => remote.getCurrentWindow().close(), []);
  return (
    <ButtonGroup className="windows-system-buttons" minimal>
      <Button
        className="minimize"
        text={WindowsButtonCodes.Minimize}
        onClick={handleMinimize}
      />
      <Button
        className="maximize"
        text={isMaximized ? WindowsButtonCodes.Restore : WindowsButtonCodes.Maximize}
        onClick={handleMaximize}
      />
      <Button
        className="close"
        text={WindowsButtonCodes.Close}
        onClick={handleClose}
      />
    </ButtonGroup>
  )
};

const Toolbar = observer(() => {
  const { uiStore } = useContext(StoreContext);

  return (
    <div id="toolbar" className={isMac ? 'mac-toolbar' : 'windows-toolbar'}>
      <OutlinerToolbar />
      {!uiStore.isToolbarVertical && <ContentToolbar />}
      <InspectorToolbar
        toggleSettings={uiStore.toggleSettings}
        toggleHelpCenter={uiStore.toggleHelpCenter}
      />
      {!isMac && <WindowsSystemButtons />}

      {/* Invisible region in order to still resize the window by dragging from the top when not maximized */}
      {!remote.getCurrentWindow().isMaximized() && <div className="resizer" />}
    </div>
  );
});

export default Toolbar;
