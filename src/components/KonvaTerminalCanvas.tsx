import React, { useCallback, useRef } from 'react';
import ReactDOM from 'react-dom';
import { Stage, Layer } from 'react-konva';
import Konva from 'konva';

Konva.pixelRatio = 1; // on mobile, stick to 1:1 size

export const KonvaTerminalCanvas: React.FC<{
  width: number;
  height: number;
  canvasContextRef: React.MutableRefObject<
    CanvasRenderingContext2D | undefined
  >;
}> = ({ width, height, canvasContextRef, children }) => {
  // read once (no support for resizing)
  const widthRef = useRef(width);
  const heightRef = useRef(height);

  const konvaLayerRefHandler = useCallback(
    (layerNode) => {
      if (layerNode) {
        const sourceCanvas = layerNode.canvas._canvas;
        canvasContextRef.current = sourceCanvas.getContext('2d');
      } else {
        canvasContextRef.current = undefined;
      }
    },
    [canvasContextRef]
  );

  return ReactDOM.createPortal(
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: '-999px',
        width: '1px',
        height: '1px',
        overflow: 'hidden',
      }}
    >
      <Stage width={widthRef.current} height={heightRef.current}>
        <Layer ref={konvaLayerRefHandler}>{children}</Layer>
      </Stage>
    </div>,
    document.body
  );
};
