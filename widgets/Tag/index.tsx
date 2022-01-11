import React, { useMemo } from 'react';

import './tag.scss';

import { IconButton } from 'widgets/Button';
import { IconSet } from '../Icons';

import { getColorFromBackground } from 'src/frontend/utils';

interface TagProps {
  text: string;
  /** background-color in CSS */
  color?: string;
  className?: string;
  onClick?: () => void;
  onRemove?: () => void;
  tooltip?: string;
  onContextMenu?: React.MouseEventHandler<HTMLSpanElement>;
}

const Tag = (props: TagProps) => {
  const { text, color, className, onClick, onRemove, tooltip } = props;

  const style = useMemo(
    () =>
      color !== undefined && color.length > 0
        ? { backgroundColor: color, color: getColorFromBackground(color) }
        : undefined,
    [color],
  );

  return (
    <span
      className={`tag ${className ?? ''}`}
      data-tooltip={tooltip}
      onClick={onClick}
      style={style}
      onContextMenu={props.onContextMenu}
    >
      <span className="label" title={text}>
        {text}
      </span>
      {onRemove !== undefined ? (
        <IconButton
          icon={IconSet.CLOSE}
          text="Remove"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
        />
      ) : null}
    </span>
  );
};

export { Tag };
