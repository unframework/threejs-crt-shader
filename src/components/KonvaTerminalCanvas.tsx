// by nick.matantsev@gmail.com, code licensed under MIT
import React, { useCallback, useRef } from 'react';
import ReactDOM from 'react-dom';
import { Stage, Layer } from 'react-konva';
import Konva from 'konva';

Konva.pixelRatio = 1; // on mobile, stick to 1:1 size

export const KonvaTerminalCanvas: React.FC<{
  width: number;
  height: number;
  canvasRef: React.MutableRefObject<
    HTMLCanvasElement | undefined
  >;
}> = ({ width, height, canvasRef, children }) => {
  // read once (no support for resizing)
  const widthRef = useRef(width);
  const heightRef = useRef(height);

  const konvaLayerRefHandler = useCallback(
    (layerNode) => {
      if (layerNode) {
        const sourceCanvas = layerNode.canvas._canvas;
        canvasRef.current = sourceCanvas;
      } else {
        canvasRef.current = undefined;
      }
    },
    [canvasRef]
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
