# threejs-crt-shader

Experimenting with displaying React content into a WebGL CRT effect material.

[Live demo sandbox](https://codesandbox.io/s/github/unframework/threejs-crt-shader) (be sure to maximize view window for scanlines to show up).

Libraries used:

- Three.js + react-three-fiber (for main 3D scene)
- react-konva (to paint vector graphics on a canvas)
- react-spring (for animation)

A source canvas is painted using react-konva and then copied into a GPU texture for 3D rendering. The CRT effect is added into a custom MeshStandardMaterial and affects the emissive properties: this allows e.g. specular highlights to still layer on top.

The philosophy behind using something like react-konva is that authoring the "on screen" contents can use well-known recipes and helper libraries from the React ecosystem. And of course react-three-fiber affords the same simple setup and state management for the main 3D scene.

TODOs:

- use Yoga flexbox layout engine with Konva
- interactivity with underlying Konva primitives
