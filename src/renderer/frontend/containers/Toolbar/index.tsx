import React, { useContext } from 'react';
import { Button, ButtonGroup } from '@blueprintjs/core';
import { observer } from 'mobx-react-lite';

import StoreContext from '../../contexts/StoreContext';
import IconSet from 'components/Icons';
import ContentToolbar from './ContentToolbar';

// Tooltip info
export const enum ToolbarTooltips {
  Add = 'Toggle Add Panel',
  Outliner = 'Toggle Outliner',
  Search = 'Toggle Search Panel',
  Media = 'Number of files in library',
  Select = 'Selects or deselects all images',
  TagFiles = 'Quick add or delete tags to selection',
  Delete = 'Delete selected missing images from library',
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
  isInspectorOpen: boolean;
  toggleInspector: () => void;
  toggleSettings: () => void;
  toggleHelpCenter: () => void;
}

const InspectorToolbar = observer(
  ({ isInspectorOpen, toggleInspector, toggleSettings, toggleHelpCenter }: IInspectorToolbar) => {
    return (
      <section id="inspector-toolbar">
        <ButtonGroup minimal>
          <Button
            icon={IconSet.INFO}
            onClick={toggleInspector}
            intent={isInspectorOpen ? 'primary' : 'none'}
            className="tooltip"
            data-left={ToolbarTooltips.Inspector}
          />
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
  },
);

const Toolbar = observer(() => {
  const { uiStore } = useContext(StoreContext);

  return (
    <div id="toolbar">
      <OutlinerToolbar />
      {!uiStore.isToolbarVertical && <ContentToolbar />}
      <InspectorToolbar
        isInspectorOpen={uiStore.isInspectorOpen}
        toggleInspector={uiStore.toggleInspector}
        toggleSettings={uiStore.toggleSettings}
        toggleHelpCenter={uiStore.toggleHelpCenter}
      />
    </div>
  );
});

export default Toolbar;
