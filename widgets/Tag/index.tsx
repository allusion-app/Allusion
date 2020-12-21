import React, { useMemo } from 'react';

import './tag.scss';

import { IconButton } from 'widgets/Button';
import { IconSet } from '../Icons';

import { getColorFromBackground } from 'src/frontend/utils';

interface ITag extends React.DOMAttributes<HTMLSpanElement> {
  text: string;
  /** background-color in CSS */
  color?: string;
  onRemove?: () => void;
}

const Tag = (props: ITag) => {
  const { text, color, onRemove, ...p } = props;
  const style = useMemo(
    () => (color ? { backgroundColor: color, color: getColorFromBackground(color) } : undefined),
    [color],
  );
  return (
    <span {...p} className="tag" style={style}>
      {text}
      {onRemove ? <IconButton icon={IconSet.CLOSE} text="Remove" onClick={onRemove} /> : null}
    </span>
  );
};

export { Tag };
