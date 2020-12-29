import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { Canvas } from 'react-three-fiber';
import * as THREE from 'three';

import { KonvaTerminalCanvas } from './components/KonvaTerminalCanvas';
import { TestScene } from './TestScene';
import { TestKonvaContent } from './TestKonvaContent';
import { TestXtermContent } from './TestXtermContent';

import './index.css';

const App = () => {
  const ctxRef = useRef();

  const [canvasContext, setCanvasContext] = useState(null);
  useEffect(() => {
    setCanvasContext(ctxRef.current);
  }, []);

  const cameraRef = useRef();

  return (
    <div>
      <Canvas
        style={{ height: '100vh' }}
        onCreated={({ gl, setDefaultCamera }) => {
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 0.9;

          gl.outputEncoding = THREE.sRGBEncoding;

          if (!cameraRef.current) {
            throw new Error('no camera');
          }

          setDefaultCamera(cameraRef.current);
        }}
      >
        {canvasContext && (
          <TestScene cameraRef={cameraRef} canvasContext={canvasContext} />
        )}
      </Canvas>

      <KonvaTerminalCanvas width={180} height={160} canvasContextRef={ctxRef}>
        <TestKonvaContent width={180} height={160} />
      </KonvaTerminalCanvas>
    </div>
  );
};

ReactDOM.render(<App />, document.getElementById('root'));
