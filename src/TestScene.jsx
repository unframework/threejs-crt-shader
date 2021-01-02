// by nick.matantsev@gmail.com, code licensed under MIT
import React, { useMemo } from 'react';
import { useFrame } from 'react-three-fiber';
import { useSpring, animated } from '@react-spring/three';
import { Environment } from '@react-three/drei/Environment';
import * as THREE from 'three';
import { useGesture } from 'react-use-gesture';

import { CRTMaterial } from './components/CRTMaterial';

const MonitorCube = React.memo(({ canvas }) => {
  // simple box body with CRT surface nudged closer to viewer to avoid Z-fighting
  const boxWidth = 4 / 3;
  const boxHeight = 1;
  const boxDepth = 1;

  return (
    <>
      <mesh>
        <boxBufferGeometry args={[boxWidth, boxHeight, boxDepth]} />
        <meshStandardMaterial
          color="#a0a8b0"
          metalness={0.5}
          roughness={0.15}
        />
      </mesh>
      <mesh position={[0, 0, boxDepth * 0.5 + 0.001]}>
        <planeBufferGeometry args={[boxWidth - 0.01, boxHeight - 0.01]} />
        <CRTMaterial
          color="#808080"
          roughness={0.08}
          metalness={0.96}
          envMapIntensity={0.1}
          // screen contents
          canvas={canvas}
          // colour grading for the CRT emissive display
          crtFgColor={new THREE.Color('#f7f2e0')}
          crtBgColor={new THREE.Color('#100400')}
          // CRT screen space in object coords
          crtPlaneOrigin={[boxWidth * -0.5, boxHeight * -0.5, -0.08]} // bottom-left origin of CRT screen
          crtPlaneNormal={[0, 0, 1]} // direction where CRT screen is facing
          crtPlaneTangent={[boxWidth, 0, 0]} // X-axis extent of the CRT screen
          crtPlaneBitangent={[0, boxHeight, 0]} // Y-axis extent of the CRT screen
        />
      </mesh>
    </>
  );
});

export const TestScene = ({ cameraRef, canvas }) => {
  const { pos, up } = useSpring({
    from: {
      pos: [-1, -8, 1],
      up: [0, 1, 0],
    },
    to: {
      pos: [0, 0.2, 2.75],
      up: [0, 1, 0],
    },
    config: {
      tension: 5,
      friction: 10,
    },
  });

  const [{ monitorRotation }, setMonitorAnim] = useSpring(() => ({
    from: {
      monitorRotation: [0, 0, 0],
    },
    to: {
      monitorRotation: [0, 0, 0],
    },
    config: {
      tension: 40,
      friction: 10,
    },
  }));

  useGesture(
    {
      onMove: ({ xy: [x, y] }) => {
        setMonitorAnim({
          monitorRotation: [
            1.5 * (y / window.innerHeight - 0.5),
            1.5 * (x / window.innerWidth - 0.5),
            0,
          ],
        });
      },
    },
    { domTarget: window }
  );

  const cameraTarget = useMemo(() => new THREE.Vector3(0, 0, 0), []);

  useFrame(() => {
    if (!cameraRef.current) {
      throw new Error('no camera');
    }

    cameraRef.current.lookAt(cameraTarget);
  });

  return (
    <>
      <animated.perspectiveCamera ref={cameraRef} position={pos} up={up} />

      <ambientLight color="#a08060" />
      <pointLight color="#f0e0ff" intensity={1.5} position={[3, 5, 5]} />

      <React.Suspense fallback={<></>}>
        <animated.group rotation={monitorRotation}>
          <MonitorCube canvas={canvas} />
        </animated.group>

        <Environment preset="warehouse" />
      </React.Suspense>
    </>
  );
};
