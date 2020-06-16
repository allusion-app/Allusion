import React, { useContext } from 'react';
import { Button, ButtonGroup } from '@blueprintjs/core';
import { observer } from 'mobx-react-lite';

import StoreContext from '../../contexts/StoreContext';
import IconSet from '../../components/Icons';
import ContentToolbar from './ContentToolbar';

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
  isInspectorOpen: boolean;
  toggleInspector: () => void;
  toggleSettings: () => void;
}

const InspectorToolbar = observer(({ toggleSettings }: IInspectorToolbar) => {
  return (
    <section id="inspector-toolbar">
      <ButtonGroup minimal>
        <Button
          icon={IconSet.SETTINGS}
          onClick={toggleSettings}
          className="tooltip"
          data-left={ToolbarTooltips.Settings}
        />
      </ButtonGroup>
    </section>
  );
});

const Toolbar = observer(() => {
  const { uiStore } = useContext(StoreContext);

  return (
    <div id="toolbar">
      <OutlinerToolbar />
      {!Boolean(uiStore.isToolbarVertical) && <ContentToolbar />}
      <InspectorToolbar
        isInspectorOpen={uiStore.isInspectorOpen}
        toggleInspector={uiStore.toggleInspector}
        toggleSettings={uiStore.toggleSettings}
      />
    </div>
  );
});

export default Toolbar;
