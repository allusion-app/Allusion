import { observer } from "mobx-react-lite";
import React from "react";
import { useContext, useEffect, useState } from "react";
import StoreContext from "src/renderer/frontend/contexts/StoreContext";
import { computeMasonryLayout } from '.';
import { ITransform } from "./masonry.worker";
import Renderer from './renderer';


interface IMasonryRendererProps {
  containerWidth: number;
}

const MasonryRenderer = observer(({ containerWidth }: IMasonryRendererProps) => {
  const { fileStore } = useContext(StoreContext);
  const [layout, setLayout] = useState<{ containerHeight: number; getTransform: (index: number) => ITransform; }>();

  useEffect(() => {
    computeMasonryLayout(fileStore.fileList, containerWidth)
      .then(setLayout)
      .catch((e) => window.alert('Could not compute layout: ' + e));
    setLayout(layout)
  }, [containerWidth, fileStore.fileList, layout]);

  return !layout ? <p>loading...</p> : (
    <Renderer
      containerWidth={containerWidth}
      containerHeight={layout.containerHeight}
      images={fileStore.fileList}
      getTransform={layout.getTransform}
    />
  )
});

export default MasonryRenderer;
