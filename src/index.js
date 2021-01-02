// by nick.matantsev@gmail.com, code licensed under MIT
import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { Canvas } from 'react-three-fiber';
import * as THREE from 'three';

import { KonvaTerminalCanvas } from './components/KonvaTerminalCanvas';
import { TestScene } from './TestScene';
import { TestKonvaContent } from './TestKonvaContent';

import './index.css';

const App = () => {
  const canvasRef = useRef();

  const [canvas, setCanvas] = useState(null);
  useEffect(() => {
    setCanvas(canvasRef.current);
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

          setDefaultCamera(cameraRef.current);
        }}
      >
        {canvas && (
          <TestScene cameraRef={cameraRef} canvas={canvas} />
        )}
      </Canvas>

      <KonvaTerminalCanvas width={180} height={160} canvasRef={canvasRef}>
        <TestKonvaContent width={180} height={160} />
      </KonvaTerminalCanvas>
    </div>
  );
};

ReactDOM.render(<App />, document.getElementById('root'));
