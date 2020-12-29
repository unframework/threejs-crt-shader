import React, { useEffect, useState } from 'react';
import { Rect, Line, Text, Group } from 'react-konva';
import onecolor from 'onecolor';

const GRID_CELL_COUNT = 5;
const GRID_LINES = [...new Array(GRID_CELL_COUNT + 1).keys()].map(
  (i) => (i - GRID_CELL_COUNT * 0.5) / (GRID_CELL_COUNT * 0.5)
);

const TestScroll = React.memo(({ width, height }) => {
  const [rows, setRows] = useState([0]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setRows((prevRows) => {
        const newRows =
          Math.random() < 0.3
            ? [...prevRows, Math.random() * 0.3].slice(-25)
            : [...prevRows];

        newRows[newRows.length - 1] = Math.min(
          1,
          newRows[newRows.length - 1] + Math.random() * 0.15
        );

        return newRows;
      });
    }, 50);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  return (
    <Group x={15} y={height - 15 - rows.length * 3}>
      {rows.map((amount, index) => {
        return (
          <Rect
            key={index}
            x={0}
            y={index * 3}
            width={Math.round(amount * 100)}
            height={2}
            fill="#80ff80"
          />
        );
      })}
    </Group>
  );
});

export const TestKonvaContent = ({ width, height }) => {
  const [blink, setBlink] = useState(false);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setBlink((prev) => !prev);
    }, 800);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  const [angleDeg, setAngleDeg] = useState(0);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setAngleDeg((prevAngleDeg) => (prevAngleDeg + 1.5) % 360);
    }, 50);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  const cx = width / 2,
    cy = height / 2;
  const currentColor = onecolor(['HSL', angleDeg / 360, 1, 0.5]).hex();
  const angle = (Math.PI * angleDeg) / 180;
  const acos = Math.cos(angle);
  const asin = Math.sin(angle);

  const outA = [0, 0];
  const outB = [0, 0];
  function computeXYZ(gx, gy, out) {
    const wx = gx * acos - gy * asin;
    const wy = gx * asin + gy * acos;

    const dz = wy + 6;
    const w = 1 / dz;
    out[0] = wx * (width / 2) * w;
    out[1] = -(-2.5 * (width / 2) * w) - 30;
  }

  return (
    <>
      {GRID_LINES.map((gx) => {
        computeXYZ(2 * gx, -2, outA);
        computeXYZ(2 * gx, 2, outB);

        return (
          <Line
            key={gx}
            points={[outA[0], outA[1], outB[0], outB[1]]}
            strokeWidth={1}
            x={width * 0.65}
            y={height * 0.6}
            stroke={currentColor}
          />
        );
      })}

      {GRID_LINES.map((gy) => {
        computeXYZ(-2, 2 * gy, outA);
        computeXYZ(2, 2 * gy, outB);

        return (
          <Line
            key={gy}
            points={[outA[0], outA[1], outB[0], outB[1]]}
            strokeWidth={1}
            x={width * 0.65}
            y={height * 0.6}
            stroke={currentColor}
          />
        );
      })}

      <Rect
        x={2.5}
        y={22.5}
        width={width - 5}
        height={height - 25}
        stroke="#00ffff"
        strokeWidth={1}
      />
      <Rect
        x={4.5}
        y={24.5}
        width={width - 9}
        height={height - 29}
        stroke="#00ffff"
        strokeWidth={1}
      />

      {blink && (
        <Text
          x={2}
          y={2}
          text="SYNTHESIS LEVEL 1"
          fontSize={16}
          fontFamily="Inconsolata"
          fill="#ffff00"
        />
      )}

      <Text
        x={15}
        y={36}
        text={`${Math.round(acos * 1000) / 1000}`}
        fontSize={10}
        fontFamily="Inconsolata"
        fill="#ff0000"
      />

      <Text
        x={15}
        y={44}
        text={`${Math.round(asin * 1000) / 1000}`}
        fontSize={10}
        fontFamily="Inconsolata"
        fill="#ff0000"
      />

      <TestScroll width={width} height={height} />
    </>
  );
};
