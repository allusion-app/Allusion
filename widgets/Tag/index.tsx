import React, { useMemo } from 'react';

import './tag.scss';

import { IconButton } from 'widgets/Button';
import { IconSet } from '../Icons';

import { getColorFromBackground } from 'src/frontend/utils';

interface ITag extends React.HTMLAttributes<HTMLSpanElement> {
  text: string;
  /** background-color in CSS */
  color?: string;
  onRemove?: () => void;
}

const Tag = (props: ITag) => {
  const { text, color, onRemove, ...restProperties } = props;

  const style = useMemo(
    () => (color ? { backgroundColor: color, color: getColorFromBackground(color) } : undefined),
    [color],
  );

  // Mutating those props is fine because the rest operator creates a new object.
  const properties = { ...restProperties, style, className: 'tag' };

  return (
    <span {...properties}>
      {text}
      {onRemove ? (
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
