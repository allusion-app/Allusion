import './window-splitter.scss';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

interface IWindowSplitter {
  id?: string;
  primary: React.ReactElement;
  secondary: React.ReactElement;
  axis: 'horizontal' | 'vertical';
  value: number;
  onResize: (value: number, dimension: number) => void;
}

export const WindowSplitter = ({
  id,
  primary,
  secondary,
  axis,
  value,
  onResize,
}: IWindowSplitter) => {
  const container = useRef<HTMLDivElement>(null);
  const [dimension, setDimension] = useState(0);
  const valueNow = useMemo(() => Math.round((value / dimension) * 100), [dimension, value]);
  const resizeObserver = useRef(
    new ResizeObserver((entries) => {
      const {
        contentRect: { width, height },
      } = entries[0];
      if (axis === 'vertical') {
        setDimension(width);
      } else {
        setDimension(height);
      }
    }),
  );

  const [isDragging, setDragging] = useState(false);

  const handleMouseDown = useRef(() => setDragging(true));

  const handleMouseUp = useRef(() => setDragging(false));

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isDragging) {
        return;
      }

      if (axis === 'vertical') {
        onResize(e.clientX, e.currentTarget.clientWidth);
      } else {
        onResize(e.clientY, e.currentTarget.clientHeight);
      }
    },
    [isDragging, onResize, axis],
  );

  useEffect(() => {
    const mouseUp = handleMouseUp.current;
    document.body.addEventListener('mouseup', mouseUp);

    return () => {
      document.body.removeEventListener('mouseup', mouseUp);
    };
  }, [handleMouseUp]);

  useEffect(() => {
    if (container.current !== null) {
      (container.current.firstElementChild as HTMLElement).style.flexBasis = `${value}px`;
    }
  }, [value]);

  useEffect(() => {
    const observer = resizeObserver.current;
    if (container.current !== null) {
      resizeObserver.current.observe(container.current);
    }
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={container}
      id={id}
      className="window-splitter"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp.current}
    >
      {primary}
      <div
        role="separator"
        aria-valuenow={valueNow}
        aria-orientation={axis}
        onMouseDown={handleMouseDown.current}
      />
      {secondary}
    </div>
  );
};
