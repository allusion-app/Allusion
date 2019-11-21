import React, { useContext, useState, useCallback, useRef, useEffect } from 'react';
import { observer } from 'mobx-react-lite';

import Konva from 'konva';
import { Stage, Layer, Image as KonvaImage, Transformer } from 'react-konva';
import { KonvaEventObject } from 'konva/types/Node';
import useImage from 'use-image';

import StoreContext from './contexts/StoreContext';
import { ClientSceneElement } from './stores/CanvasStore';
import { ContextMenu, Menu, MenuItem, MenuDivider, H4, Button } from '@blueprintjs/core';
import { Vector2d } from 'konva/types/types';

class KeyListener {
  isCtrlDown: boolean = false;
  isShiftDown: boolean = false;

  constructor() {
    window.addEventListener('keydown', this.onKeyDown.bind(this));
    window.addEventListener('keyup', this.onKeyUp.bind(this));
  }

  onKeyDown(e: KeyboardEvent) {
    this.isCtrlDown = e.ctrlKey;
    this.isShiftDown = e.shiftKey;
  }
  onKeyUp(e: KeyboardEvent) {
    this.isCtrlDown = e.ctrlKey;
    this.isShiftDown = e.shiftKey;
  }
}

const keyListener = new KeyListener();


const BaseContextMenuItems = () => {
  // const { canvasStore } = useContext(StoreContext);
  return (
    <>
      <MenuItem text="Arrange">
        <MenuItem text="By name" />
        <MenuItem text="By addition" />
        <MenuItem text="By modified" />
        <MenuItem text="By import" />
      </MenuItem>
      
      <MenuItem text="Normalize">
        <MenuItem text="By size" />
        <MenuItem text="By width" />
        <MenuItem text="By height" />
      </MenuItem>
    </>
  )
};

const BackgroundContextMenu = () => <Menu><BaseContextMenuItems /></Menu>;

const ElementContextMenu = ({ element }: { element: ClientSceneElement }) => (
  <Menu>
    <MenuItem onClick={console.log} text="Fit to view" />
    <MenuItem onClick={console.log} text="Crop" />
    <MenuItem onClick={console.log} text="Reveal in File Browser" />
    <MenuItem onClick={() => element.store.selectedScene.removeElement(element)} text="Delete" />
    <MenuDivider />
    <MenuItem onClick={console.log} text="Bring to front" />
    <MenuItem onClick={console.log} text="Send to back" />
    <MenuDivider />
    <BaseContextMenuItems />
  </Menu>
);

interface ICanvasImageProps {
  element: ClientSceneElement;
  isSelected: boolean;
  onSelect: (id: string | undefined) => void;
  // onChange: (x: number, y: number, scale: number) => void;
}

const CanvasImage = observer(({ element, isSelected, onSelect }: ICanvasImageProps) => {
  const [image] = useImage(element.clientFile.path);
  const konvaImgRef = useRef<Konva.Image>(null);
  const trRef = useRef<Konva.Transformer>(null);

  const [dragStartPos, setDragStartPos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (isSelected && trRef.current !== null && konvaImgRef.current !== null) {
      // we need to attach transformer manually
      trRef.current.setNode(konvaImgRef.current);
      trRef.current.getLayer()!.batchDraw();
    }
  }, [isSelected]);

  const handleTransformEnd = useCallback((e: KonvaEventObject<MouseEvent>) => {
    element.setScale(e.target.scaleX());
    element.setPosition(e.target.x(), e.target.y());
  }, []);
  
  const handleDragStart = useCallback((e: KonvaEventObject<DragEvent>) => {
    if (e.evt.buttons === 4) { // middle mouse
      // Stop drag for img, but start drag for background (panning)
      e.target.stopDrag();
      e.target.getStage()!.startDrag(e);
    }
    setDragStartPos(e.target.getAbsolutePosition());
  }, []);

  const handleClick = useCallback((e: KonvaEventObject<MouseEvent>) => {
    if (e.evt.button === 0) {
      onSelect(isSelected ? undefined : element.imageId);
    }
  }, [isSelected]);

  const handleContextMenu = useCallback((e: KonvaEventObject<MouseEvent>) => {
    onSelect(element.imageId);
    const menu = <ElementContextMenu element={element} />;
    ContextMenu.show(menu, { left: e.evt.clientX, top: e.evt.clientY });
    e.cancelBubble = true;
  }, []);

  const handleDragBounds = useCallback(function (this: Konva.Image, pos: Vector2d) {
    // Restrict drag when pressing shift
    if (keyListener.isShiftDown) {
      const deltaDragX = pos.x - dragStartPos.x;
      const deltaDragY = pos.y - dragStartPos.y;
      if (Math.abs(deltaDragX) > Math.abs(deltaDragY)) {
        return { x: pos.x, y: dragStartPos.y };
      } else {
        return { x: dragStartPos.x, y: pos.y };
      }
    }
    return pos;
  }, [dragStartPos]);

  return (
    <>
      <KonvaImage
        image={image}
        x={element.position.x}
        y={element.position.y}
        scaleX={element.scale}
        scaleY={element.scale}
        onClick={handleClick}
        onContextMenu={handleContextMenu}
        onDragStart={handleDragStart}
        onDragEnd={handleTransformEnd}
        onTransformEnd={handleTransformEnd}
        draggable
        id={element.imageId}
        key={element.imageId}
        ref={konvaImgRef}
        dragBoundFunc={handleDragBounds}
        // crop={{ }}
      />
      {isSelected && (
        <Transformer
          ref={trRef}
          keepRatio
          rotateEnabled={false}
          enabledAnchors={['top-left', 'top-right', 'bottom-left', 'bottom-right']}
        />
      )}
    </>
  );
});

// TODO: Undo/redo: https://konvajs.org/docs/react/Undo-Redo.html
const Canvas = () => {
  const { canvasStore } = useContext(StoreContext);

  const [stageScale, setStageScale] = useState(1);
  const [stagePos, setStagePos] = useState([0, 0]);

  const [selectedId, setSelectedId] = useState<string>();

  const layerRef = useRef<Konva.Layer>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => wrapperRef.current!.focus(), [selectedId]);

  // From https://stackoverflow.com/questions/52054848/how-to-react-konva-zooming-on-scroll
  const handleWheel = useCallback((e: KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();

    const scaleBy = 1.1;
    const stage = e.target.getStage()!;

    const pointerPos = stage.getPointerPosition()!;

    const oldScale = stage.scaleX();
    const mousePointTo = {
      x: pointerPos.x / oldScale - stage.x() / oldScale,
      y: pointerPos.y / oldScale - stage.y() / oldScale
    };

    const newScale = e.evt.deltaY < 0 ? oldScale * scaleBy : oldScale / scaleBy;

    stage.scale({ x: newScale, y: newScale });

    setStageScale(newScale);
    setStagePos([
      -(mousePointTo.x - pointerPos.x / newScale) * newScale,
      -(mousePointTo.y - pointerPos.y / newScale) * newScale
    ]);
  }, []);

  const handleClickBackground = useCallback((e: KonvaEventObject<MouseEvent>) => {
    e.evt.preventDefault();
    const clickedOnEmpty = e.target === e.target.getStage();
    if (clickedOnEmpty) {
      setSelectedId(undefined);
    }
  }, []);

  const handleDragStart = useCallback((e: KonvaEventObject<DragEvent>) => {
    if (e.target === e.target.getStage() && e.evt.buttons !== 4) {
      e.target.stopDrag();
    }
  }, []);

  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Delete' && selectedId) {
      setSelectedId(undefined);
      canvasStore.selectedScene.removeElement(canvasStore.selectedScene.elements.find((el) => el.imageId === selectedId)!);
    }
  }, [selectedId]);

  const handleContextMenu = useCallback((e: KonvaEventObject<MouseEvent>) => {
    const menu = <BackgroundContextMenu/>;
    ContextMenu.show(menu, { left: e.evt.clientX, top: e.evt.clientY });
  }, []);

  return (
    <div
      onKeyDown={handleKeyPress}
      tabIndex={2}
      ref={wrapperRef}
    >
      <Stage
        width={window.innerWidth}
        height={window.innerHeight}
        onWheel={handleWheel}
        scaleX={stageScale}
        scaleY={stageScale}
        x={stagePos[0]}
        y={stagePos[1]}
        onMouseDown={handleClickBackground}
        onDragStart={handleDragStart}
        onContextMenu={handleContextMenu}
        draggable
      >
        <Layer ref={layerRef}>
          {canvasStore.selectedScene.elements.map((el) => (
            <CanvasImage
              key={el.imageId}
              element={el}
              isSelected={selectedId === el.imageId}
              onSelect={setSelectedId}
            />
          ))}

          {/* Selection rect; shown when dragging on background */}
          {/* <Rect x={0} y={0} width={10} height={10} stroke="blue" strokeWidth={4} /> */}
        </Layer>
      </Stage>
    </div>
  )
}

export default observer(Canvas);

export const CanvasScenePanel = observer(() => {
  const { canvasStore } = useContext(StoreContext);

  return (
    <div>
      <H4>Canvas scenes</H4>
      <Button onClick={() => canvasStore.addScene()} icon="plus" />
      <ul>
      { canvasStore.scenes.map((scene) => (
        <li onClick={() => canvasStore.selectScene(scene)} key={scene.id}>
          {scene.name}
          <Button icon="trash" onClick={() => canvasStore.removeScene(scene)} />
        </li>
      ))}
      </ul>
    </div>
  )
});