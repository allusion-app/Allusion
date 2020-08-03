import React, { useContext, useCallback, useEffect, useState } from 'react';
import { Button, ButtonGroup } from '@blueprintjs/core';
import { observer } from 'mobx-react-lite';

import StoreContext from '../../contexts/StoreContext';
import IconSet from 'components/Icons';
import ContentToolbar from './ContentToolbar';
import { remote } from 'electron';

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
          active={uiStore.isOutlinerOpen}
          className="tooltip"
          data-right={ToolbarTooltips.Outliner}
        />
        {/* <Button
          icon={IconSet.INFO}
          onClick={uiStore.toggleInspector}
          active={uiStore.isInspectorOpen}
          className="tooltip"
          data-right={ToolbarTooltips.Inspector}
        />
        <Button
          icon={IconSet.PREVIEW}
          onClick={uiStore.openPreviewWindow}
          active={uiStore.isPreviewOpen}
          className="tooltip"
          data-right={`${ToolbarTooltips.Preview} (${uiStore.hotkeyMap.openPreviewWindow})`}
          disabled={uiStore.fileSelection.length === 0}
        /> */}
      </ButtonGroup>
    </section>
  );
});

const InspectorToolbar = observer(() => {
  const { uiStore } = useContext(StoreContext);
  return (
    <ButtonGroup id="inspector-toolbar" minimal>
      <Button
        icon={IconSet.INFO}
        onClick={uiStore.toggleInspector}
        intent={uiStore.isInspectorOpen ? 'primary' : 'none'}
        className="tooltip"
        data-right={ToolbarTooltips.Inspector}
      />
      <Button
        icon={IconSet.HELPCENTER}
        onClick={uiStore.toggleHelpCenter}
        className="tooltip"
        data-left={ToolbarTooltips.HelpCenter}
      />
      <Button
        icon={IconSet.SETTINGS}
        onClick={uiStore.toggleSettings}
        className="tooltip"
        data-left={ToolbarTooltips.Settings}
      />
    </ButtonGroup>
  );
});

const WindowsButtonCodes = {
  Minimize: <>&#xE921;</>,
  Maximize: <>&#xE922;</>,
  Restore: <>&#xE923;</>,
  Close: <>&#xE8BB;</>,
};

const WindowsSystemButtons = ({ isMaximized }: { isMaximized: boolean }) => {
  const handleMinimize = useCallback(() => remote.getCurrentWindow().minimize(), []);
  const handleMaximize = useCallback(
    () =>
      isMaximized ? remote.getCurrentWindow().restore() : remote.getCurrentWindow().maximize(),
    [isMaximized],
  );
  const handleClose = useCallback(() => remote.getCurrentWindow().close(), []);
  return (
    <ButtonGroup id="window-system-buttons" minimal>
      <Button className="minimize" text={WindowsButtonCodes.Minimize} onClick={handleMinimize} />
      <Button
        className="maximize"
        text={isMaximized ? WindowsButtonCodes.Restore : WindowsButtonCodes.Maximize}
        onClick={handleMaximize}
      />
      <Button className="close" text={WindowsButtonCodes.Close} onClick={handleClose} />
    </ButtonGroup>
  );
};

const WindowDecoration = ({ isMac }: { isMac: boolean }) => {
  const [isMaximized, setMaximized] = useState(remote.getCurrentWindow().isMaximized());
  useEffect(() => {
    remote.getCurrentWindow().on('maximize', () => setMaximized(true));
    remote.getCurrentWindow().on('unmaximize', () => setMaximized(false));
  }, []);

  return (
    <>
      {/* Invisible region for dragging/resizing the window at the top */}
      {!isMaximized && <div id="window-resize-area" />}

      {!isMac && <WindowsSystemButtons isMaximized={isMaximized} />}
    </>
  );
};

const Toolbar = observer(({ isMac }: { isMac: boolean }) => {
  const { uiStore } = useContext(StoreContext);

  return (
    <div id="toolbar" className={isMac ? 'mac-toolbar' : 'windows-toolbar'}>
      <OutlinerToolbar />

      {!uiStore.isToolbarVertical && <ContentToolbar />}

      <InspectorToolbar />

      <WindowDecoration isMac={isMac} />
    </div>
  );
});

export default Toolbar;
