declare module "masonic" {
  import * as React from 'react';

  

  export interface IMasonryProps<T> {
    columnWidth?: number;
    columnGutter?: number;
    columnCount?: number;
    render(props: { index: number, data: T, width: number }): any;
    items: T[];
    itemHeightEstimate?: number;
    itemAs?: React.Component | 'div' | 'span';
    itemKey(item: T): string;
    initialWidth?: number;
    initialHeight?: number;
    // Default of 2
    overscanBy?: number;
    windowScroller?: { scroll: { fps: number }, size: { wait: number }}
    onRender?(startIndex: number, stopIndex: number, items: T[]): any;
  }

  export class Masonry<T> extends React.Component<IMasonryProps<T>, any> {
    // static ofType<T>(): new (props: IMasonryProps<T>) => Masonry<T>;
  }
}
