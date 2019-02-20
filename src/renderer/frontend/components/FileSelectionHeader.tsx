import React from 'react';
import { Icon, Popover, Button, Classes, Intent, H5 } from '@blueprintjs/core';

interface IFileSelectionHeaderProps {
  numSelectedFiles: number;
  onCancel: () => void;
  onRemove: () => void;
}

const FileSelectionHeader = ({
  numSelectedFiles,
  onCancel,
  onRemove,
}: IFileSelectionHeaderProps) => {
  return (
    <div className="fileSelectionHeader">
      <Icon
        icon="cross"
        iconSize={Icon.SIZE_LARGE}
        className="icon"
        onClick={onCancel}
      />
      <span>
        {numSelectedFiles} image{numSelectedFiles > 1 ? 's' : ''} selected
      </span>
      <Popover position="bottom-left">
        <Icon icon="trash" iconSize={Icon.SIZE_LARGE} className="icon" />
        <div className="popoverContent">
          <H5>Confirm deletion</H5>
          <p>Are you sure you want to remove these images from your library?</p>
          <p>Your files will not be deleted.</p>

          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              marginTop: 15,
            }}>
            <Button
              className={Classes.POPOVER_DISMISS}
              style={{ marginRight: 10 }}>
              Cancel
            </Button>
            <Button
              intent={Intent.DANGER}
              className={Classes.POPOVER_DISMISS}
              onClick={onRemove}>
              Delete
            </Button>
          </div>
        </div>
      </Popover>
    </div>
  );
};

export default FileSelectionHeader;
